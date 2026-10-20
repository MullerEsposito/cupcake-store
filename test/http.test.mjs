import { createTypeOrmFixture } from '../test-support/typeorm.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/adapters/http/server.ts';
import { ApplicationError } from '../src/shared/errors/ApplicationError.ts';
import { Sessions } from '../src/infrastructure/security/primitives.ts';

async function fixture(context, changes = {}) {
  const user = { id: '1', name: 'Cliente Teste', email: 'cliente@example.com', role: 'CLIENTE', passwordHash: 'NUNCA_EXPOR', active: true, failedAttempts: 0, blockedUntil: null };
  const product = { id: '1', name: 'Cupcake de teste', price: '12.90', stock: 2 };
  const store = {
    products: async () => [product],
    product: async id => { if (id !== '1') throw new ApplicationError('NOT_FOUND', 'Produto não encontrado.'); return product; },
    register: async input => { assert.equal(input.role, 'CLIENTE'); return user; },
    login: async () => user,
    user: async () => user,
    ...changes
  };
  const dataSource = createTypeOrmFixture(store);
  const sessions = new Sessions();
  const app = createApp({
    dataSource,
    passwords: { hash: async () => 'NUNCA_EXPOR', verify: async () => true },
    sessions
  }, { origin: 'http://localhost:3000', logger: { error() {} } });
  const server = await new Promise(resolve => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  context.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const url = `http://127.0.0.1:${server.address().port}`;
  return { url, post: (path, data, headers = {}) => fetch(url + path, {
    method: 'POST', headers: { Origin: 'http://localhost:3000', 'X-Cupcake-Request': '1', 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(data)
  }) };
}

test('catálogo é público e detalhe inexistente retorna 404', async context => {
  const { url } = await fixture(context);
  const result = await fetch(url + '/api/products');
  assert.equal(result.status, 200);
  assert.equal((await result.json()).products.length, 1);
  assert.equal((await fetch(url + '/api/products/2')).status, 404);
  assert.equal((await fetch(url + '/api/products/1')).status, 200);
});

test('cadastro emite cookie protegido e não expõe hash nem aceita perfil enviado', async context => {
  const { post, url } = await fixture(context);
  const result = await post('/api/register', { name: 'Cliente Teste', email: 'cliente@example.com', password: 'senha-longa-de-teste', role: 'ADMIN', perfil: 'ADMIN' });
  assert.equal(result.status, 201);
  const cookie = result.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly; SameSite=Strict/);
  const data = await result.json();
  assert.equal(data.user.role, 'CLIENTE');
  assert.deepEqual(Object.keys(data), ['user']);
  assert.equal(JSON.stringify(data).includes('NUNCA_EXPOR'), false);
  const authenticated = await fetch(url + '/api/session', { headers: { Cookie: cookie.split(';')[0] } });
  assert.equal((await authenticated.json()).user.id, '1');
  await post('/api/logout', {}, { Cookie: cookie.split(';')[0] });
  const loggedOut = await fetch(url + '/api/session', { headers: { Cookie: cookie.split(';')[0] } });
  assert.equal((await loggedOut.json()).user, null);
});

test('origem externa e corpo inválido são rejeitados', async context => {
  const { post, url } = await fixture(context);
  assert.equal((await post('/api/login', {}, { Origin: 'https://externo.example' })).status, 403);
  const result = await fetch(url + '/api/login', { method: 'POST', headers: { Origin: 'http://localhost:3000', 'X-Cupcake-Request': '1', 'Content-Type': 'application/json' }, body: '{invalido' });
  assert.equal(result.status, 400);
  assert.equal((await post('/api/register', { email: 'invalido' })).status, 400);
});

test('novo login rotaciona cookie sem expor token e isola sessões entre aplicações', async context => {
  const first = await fixture(context);
  const second = await fixture(context);
  const input = { name: 'Cliente Teste', email: 'cliente@example.com', password: 'senha-longa-de-teste' };
  const registered = await first.post('/api/register', input);
  const previousCookie = registered.headers.get('set-cookie').split(';')[0];
  const loggedIn = await first.post('/api/login', input, { Cookie: previousCookie });
  assert.equal(loggedIn.status, 200);
  const currentCookie = loggedIn.headers.get('set-cookie').split(';')[0];
  assert.notEqual(currentCookie, previousCookie);
  assert.deepEqual(Object.keys(await loggedIn.json()), ['user']);
  for (const [url, cookie, expected] of [
    [first.url, previousCookie, null], [first.url, currentCookie, '1'], [second.url, currentCookie, null]
  ]) {
    const result = await fetch(url + '/api/session', { headers: { Cookie: cookie } });
    assert.equal((await result.json()).user?.id ?? null, expected);
  }
});

test('falha de banco produz mensagem tratada sem expor detalhes', async context => {
  const { url } = await fixture(context, { products: async () => { throw new Error('senha-super-secreta'); } });
  const result = await fetch(url + '/api/products');
  assert.equal(result.status, 503);
  assert.equal((await result.text()).includes('senha-super-secreta'), false);
});

test('login rejeitado preserva a sessão anterior sem emitir cookie', async context => {
  const { post, url } = await fixture(context, { login: async () => null });
  const input = { name: 'Cliente Teste', email: 'cliente@example.com', password: 'senha-longa-de-teste' };
  const registered = await post('/api/register', input);
  const cookie = registered.headers.get('set-cookie').split(';')[0];
  const rejected = await post('/api/login', input, { Cookie: cookie });
  assert.equal(rejected.status, 401);
  assert.equal(rejected.headers.get('set-cookie'), null);
  const result = await fetch(url + '/api/session', { headers: { Cookie: cookie } });
  assert.equal((await result.json()).user.id, '1');
});

test('login impede excesso de solicitações por IP', async context => {
  const { post } = await fixture(context);
  for (let attempt = 0; attempt < 20; attempt++) await post('/api/login', {});
  assert.equal((await post('/api/login', {})).status, 429);
});

test('Express rejeita corpos incompatíveis ou grandes sem expor o conteúdo', async context => {
  const { post, url } = await fixture(context);
  assert.equal((await post('/api/login', {}, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await post('/api/login', [])).status, 400);
  assert.equal((await post('/api/login', null)).status, 400);
  const oversized = await post('/api/register', { name: 'segredo-de-teste'.repeat(1000) });
  assert.equal(oversized.status, 413);
  assert.equal((await oversized.text()).includes('segredo-de-teste'), false);
  const missing = await fetch(url + '/api/nao-existe');
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get('content-type'), /application\/json/);
});

test('Express mantém cabeçalhos de segurança e oculta identificação do framework', async context => {
  const { url } = await fixture(context);
  const result = await fetch(url + '/api/products');
  assert.equal(result.headers.get('x-powered-by'), null);
  assert.equal(result.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(result.headers.get('x-frame-options'), 'DENY');
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.match(result.headers.get('content-security-policy'), /frame-ancestors 'none'/);
});

test('router exportado mantém controllers e limite de tentativas isolados por aplicação', async context => {
  const first = await fixture(context, { products: async () => [{ id: 'primeira' }] });
  const second = await fixture(context, { products: async () => [{ id: 'segunda' }] });
  assert.equal((await (await fetch(first.url + '/api/products')).json()).products[0].id, 'primeira');
  assert.equal((await (await fetch(second.url + '/api/products')).json()).products[0].id, 'segunda');
  for (let attempt = 0; attempt < 21; attempt++) await first.post('/api/login', {});
  assert.equal((await first.post('/api/login', {})).status, 429);
  assert.notEqual((await second.post('/api/login', {})).status, 429);
});
