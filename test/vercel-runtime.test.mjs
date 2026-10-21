import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PostgresSessions } from '../src/infrastructure/security/PostgresSessions.ts';
import { PostgresRuntime } from '../src/infrastructure/security/PostgresRuntime.ts';
import { createDataSource } from '../src/infrastructure/typeorm/data-source.ts';
import { createApp } from '../src/adapters/http/server.ts';
import { createTypeOrmFixture } from '../test-support/typeorm.mjs';

test('sessões compartilhadas armazenam hash e não o token; logout vale para outra instância', async () => {
  const stored = new Map();
  const calls = [];
  const database = { query: async (sql, params = []) => {
    calls.push({ sql, params });
    if (sql.startsWith('INSERT')) stored.set(params[0], params[1]);
    if (sql.startsWith('SELECT')) return stored.has(params[0]) ? [{ user_id: stored.get(params[0]) }] : [];
    if (sql.startsWith('DELETE') && params.length) stored.delete(params[0]);
    return [];
  } };
  const first = new PostgresSessions(database);
  const second = new PostgresSessions(database);
  const token = await first.create('42');
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal(await second.get(token), '42');
  assert.equal(stored.has(createHash('sha256').update(token).digest('hex')), true);
  assert.equal(calls.some(call => call.params.includes(token)), false);
  const count = calls.length;
  assert.equal(await second.get('inválido'), null);
  assert.equal(calls.length, count);
  await second.delete(token);
  assert.equal(await first.get(token), null);
  assert.match(calls.find(call => call.sql.startsWith('SELECT')).sql, /expires_at > clock_timestamp/);
});

test('limite compartilhado é atômico no PostgreSQL e não persiste IP em texto', async () => {
  const calls = [];
  let count = 0;
  const runtime = new PostgresRuntime({ query: async (sql, params = []) => {
    calls.push({ sql, params });
    return sql.startsWith('INSERT') ? [{ count: ++count }] : [];
  } });
  await runtime.consumeRateLimit('auth:192.0.2.10', 1);
  await assert.rejects(runtime.consumeRateLimit('auth:192.0.2.10', 1), error => error.code === 'RATE_LIMIT');
  assert.match(calls.find(call => call.sql.startsWith('INSERT')).sql, /ON CONFLICT/);
  assert.equal(calls.some(call => JSON.stringify(call.params).includes('192.0.2.10')), false);
});

test('conexões de acompanhamento usam trava e cota compartilhada, com liberação e expiração', async () => {
  const calls = [];
  const query = async (sql, params = []) => {
    calls.push({ sql, params });
    return sql.startsWith('SELECT count') ? [{ total: 0, owned: 0 }] : [];
  };
  const runtime = new PostgresRuntime({ query, transaction: operation => operation({ query }) });
  const release = await runtime.acquireOrderStream('7');
  assert.match(calls[0].sql, /pg_advisory_xact_lock/);
  assert.match(calls.find(call => call.sql.startsWith('INSERT')).sql, /interval '5 minutes'/);
  await release();
  assert.match(calls.at(-1).sql, /DELETE FROM app_runtime.order_stream WHERE id = \$1/);
  const full = new PostgresRuntime({ transaction: operation => operation({ query: async sql => sql.startsWith('SELECT count') ? [{ total: 100, owned: 0 }] : [] }) });
  await assert.rejects(full.acquireOrderStream('7'), error => error.code === 'RATE_LIMIT');
});

test('configuração remota exige TLS validado, não mistura credenciais locais e não sincroniza esquema', () => {
  const previous = { DATABASE_URL: process.env.DATABASE_URL, VERCEL: process.env.VERCEL };
  try {
    process.env.DATABASE_URL = 'postgresql://demo:fake@database.example.test/neondb?sslmode=require';
    process.env.VERCEL = '1';
    const source = createDataSource();
    assert.equal(source.options.ssl.rejectUnauthorized, true);
    assert.doesNotMatch(source.options.url, /sslmode=/);
    assert.equal(source.options.synchronize, false);
    assert.equal(source.options.migrationsRun, false);
    assert.equal(source.options.extra.max, 3);
    assert.equal(source.options.host, undefined);
    delete process.env.DATABASE_URL;
    assert.throws(createDataSource, /DATABASE_URL obrigatória/);
  } finally {
    for (const [key, value] of Object.entries(previous)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

test('SSE observa revisões de outra instância com sessão assíncrona e libera a conexão', async context => {
  let revision = '0';
  let released = 0;
  const sharedRuntime = {
    consumeRateLimit: async () => {},
    orderVersion: async () => revision,
    announceOrder: async () => { revision = String(Number(revision) + 1); },
    acquireOrderStream: async () => async () => { released++; }
  };
  const app = createApp({ dataSource: createTypeOrmFixture(), sessions: { get: async () => '1' }, passwords: {}, sharedRuntime }, { logger: { error() {} } });
  const server = await new Promise(resolve => { const listening = app.listen(0, '127.0.0.1', () => resolve(listening)); });
  context.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/orders/events', { headers: { Cookie: 'cupcake_session=demo' }, signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200);
  const reader = response.body.getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value), /event: connected/);
  await sharedRuntime.announceOrder();
  assert.match(new TextDecoder().decode((await reader.read()).value), /event: orders-changed/);
  await reader.cancel();
  await new Promise(resolve => setImmediate(resolve));
  server.closeAllConnections();
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal(released, 1);
});
