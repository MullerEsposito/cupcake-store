import test from 'node:test';
import assert from 'node:assert/strict';
import { AxiosError, CanceledError } from 'axios';
import { createHttpClient } from '../client/src/infrastructure/http-client.ts';
import { createStorefrontApi } from '../client/src/infrastructure/storefront-api.ts';

function successfulResponse(config, data) {
  return { config, data, status: 200, statusText: 'OK', headers: {} };
}

test('Axios preserva contrato HTTP, cookies, cabeçalho e timeout', async () => {
  let captured;
  const api = createStorefrontApi(createHttpClient({ adapter: async config => {
    captured = config;
    return successfulResponse(config, { user: { id: '1' } });
  } }));
  assert.deepEqual(await api.login({ email: 'cliente@example.com', password: 'teste' }), { id: '1' });
  assert.equal(captured.baseURL, '/api');
  assert.equal(captured.url, '/login');
  assert.equal(captured.method, 'post');
  assert.equal(captured.withCredentials, true);
  assert.equal(captured.timeout, 10000);
  assert.equal(captured.headers.get('X-Cupcake-Request'), '1');
  assert.equal(JSON.parse(captured.data).email, 'cliente@example.com');
});

test('Axios traduz falhas de rede e timeout', async () => {
  for (const [code, message] of [['ERR_NETWORK', /Não foi possível conectar/], ['ECONNABORTED', /demorou demais/]]) {
    const api = createStorefrontApi(createHttpClient({ adapter: async config => { throw new AxiosError('erro interno', code, config); } }));
    await assert.rejects(api.products(), message);
  }
});

test('cancelamento do Axios preserva o contrato dos hooks React', async () => {
  const controller = new AbortController();
  let receivedSignal;
  const api = createStorefrontApi(createHttpClient({ adapter: async config => {
    receivedSignal = config.signal;
    throw new CanceledError('Cancelado');
  } }));
  await assert.rejects(api.products(controller.signal), error => error.name === 'AbortError');
  assert.equal(receivedSignal, controller.signal);
});

test('Axios mantém a mensagem da API sem repetir operações POST', async () => {
  let calls = 0;
  const api = createStorefrontApi(createHttpClient({ adapter: async config => {
    calls++;
    throw new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
      data: { error: 'Credenciais inválidas' }, status: 401, headers: {}, config
    });
  } }));
  await assert.rejects(api.login({}), /Credenciais inválidas/);
  assert.equal(calls, 1);
});

test('gateway usa todos os endpoints e mantém catálogo vazio real', async () => {
  const paths = [];
  const api = createStorefrontApi(createHttpClient({ adapter: async config => {
    paths.push(config.url);
    return successfulResponse(config, { products: [], product: { id: '2' }, user: null, message: 'Saiu' });
  } }));
  assert.deepEqual(await api.products(), []);
  assert.deepEqual(await api.product('2'), { id: '2' });
  assert.equal(await api.session(), null);
  assert.equal(await api.register({}), null);
  assert.deepEqual(await api.logout(), { products: [], product: { id: '2' }, user: null, message: 'Saiu' });
  assert.deepEqual(paths, ['/products', '/products/2', '/session', '/register', '/logout']);
});
