import test from 'node:test';
import assert from 'node:assert/strict';
import { PgStore } from '../src/store.mjs';
import { hashPassword } from '../src/security.mjs';

function fakePool(user) {
  const queries = [];
  let released = false;
  const client = {
    async query(sql, values) { queries.push({ sql, values }); return { rows: sql.startsWith('SELECT') && user ? [user] : [] }; },
    release() { released = true; }
  };
  return { pool: { connect: async () => client }, queries, released: () => released };
}

test('quinta senha inválida persiste bloqueio antes de retornar 429', async () => {
  const user = { id: '1', ativo: true, tentativas_falhas: 4, senha_hash: await hashPassword('senha-correta-longa') };
  const fixture = fakePool(user);
  await assert.rejects(new PgStore(fixture.pool).login({ email: 'cliente@example.com', password: 'errada' }), error => error.status === 429);
  const update = fixture.queries.find(entry => entry.sql.includes('SET tentativas_falhas = $2'));
  assert.deepEqual(update.values, ['1', 5]);
  assert.ok(fixture.queries.some(entry => entry.sql === 'COMMIT'));
  assert.ok(fixture.queries.some(entry => entry.sql.includes('FOR UPDATE')));
  assert.equal(fixture.released(), true);
});

test('conta bloqueada não entra mesmo com a senha correta', async () => {
  const fixture = fakePool({ id: '1', ativo: true, bloqueado_ate: new Date(Date.now() + 60000), tentativas_falhas: 5 });
  await assert.rejects(new PgStore(fixture.pool).login({ email: 'cliente@example.com', password: 'senha-correta-longa' }), error => error.status === 429);
  assert.equal(fixture.queries.some(entry => entry.sql.startsWith('UPDATE')), false);
});

test('login válido limpa contagem e libera a conexão', async () => {
  const user = { id: '1', ativo: true, tentativas_falhas: 2, senha_hash: await hashPassword('senha-correta-longa') };
  const fixture = fakePool(user);
  assert.equal((await new PgStore(fixture.pool).login({ email: 'cliente@example.com', password: 'senha-correta-longa' })).id, '1');
  assert.ok(fixture.queries.some(entry => entry.sql.includes('tentativas_falhas = 0')));
  assert.equal(fixture.released(), true);
});
