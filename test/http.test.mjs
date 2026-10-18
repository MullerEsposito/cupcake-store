import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.mjs';
import { HttpError } from '../src/security.mjs';

async function fixture(context, changes = {}) {
  const user = { id: '1', nome: 'Cliente Teste', email: 'cliente@example.com', perfil: 'CLIENTE', senha_hash: 'NUNCA_EXPOR' };
  const product = { id: '1', name: 'Cupcake de teste', price: '12.90', stock: 2 };
  const store = {
    products: async () => [product],
    product: async id => { if (id !== '1') throw new HttpError(404, 'Produto não encontrado.'); return product; },
    register: async input => { assert.equal(input.role, undefined); return user; },
    login: async () => user,
    user: async () => user,
    ...changes
  };
  const server = createApp(store, { origin: 'http://localhost:3000', logger: { error() {} } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
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

test('falha de banco produz mensagem tratada sem expor detalhes', async context => {
  const { url } = await fixture(context, { products: async () => { throw new Error('senha-super-secreta'); } });
  const result = await fetch(url + '/api/products');
  assert.equal(result.status, 503);
  assert.equal((await result.text()).includes('senha-super-secreta'), false);
});

test('login impede excesso de solicitações por IP', async context => {
  const { post } = await fixture(context);
  for (let attempt = 0; attempt < 20; attempt++) await post('/api/login', {});
  assert.equal((await post('/api/login', {})).status, 429);
});
