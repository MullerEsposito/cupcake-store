import test from 'node:test';
import assert from 'node:assert/strict';
import { RegisterUserController } from '../src/modules/users/useCases/registerUser/RegisterUserController.ts';
import { GetCurrentUserController } from '../src/modules/users/useCases/getCurrentUser/GetCurrentUserController.ts';
import { LogoutUserController } from '../src/modules/users/useCases/logoutUser/LogoutUserController.ts';
import { LogoutUserService } from '../src/modules/users/useCases/logoutUser/LogoutUserService.ts';
import { ListProductsController } from '../src/modules/catalog/useCases/listProducts/ListProductsController.ts';
import { GetProductController } from '../src/modules/catalog/useCases/getProduct/GetProductController.ts';
import { createRateLimiter } from '../src/adapters/http/middlewares/security.ts';
import { Sessions } from '../src/infrastructure/security/primitives.ts';

function request(body = {}, cookie, userId = null) {
  return { body, headers: { 'content-type': 'application/json', cookie },
    authentication: { token: cookie?.split('cupcake_session=')[1], userId } };
}

function response() {
  return {
    statusCode: 200, headers: {}, body: null,
    status(value) { this.statusCode = value; return this; },
    set(name, value) { this.headers[name] = value; return this; },
    json(value) { this.body = value; return this; }
  };
}

test('controller de cadastro adapta resultado do serviço sem gerenciar sessões', async () => {
  const previous = 'sessao-anterior';
  let input;
  let previousToken;
  const controller = new RegisterUserController({
    execute: async (value, token) => { input = value; previousToken = token; return { user: { id: '1', name: 'Cliente' }, token: 'novo-token' }; }
  }, 'https://cupcake.example');
  const result = await controller.handle(request({ name: 'Cliente' }, `cupcake_session=${previous}`), response());
  assert.equal(input.name, 'Cliente');
  assert.equal(result.statusCode, 201);
  assert.match(result.headers['Set-Cookie'], /HttpOnly; SameSite=Strict.*; Secure$/);
  assert.equal(previousToken, previous);
  assert.deepEqual(result.body, { user: { id: '1', name: 'Cliente' } });
  assert.match(result.headers['Set-Cookie'], /^cupcake_session=novo-token;/);
});

test('controller de sessão e logout resolve e invalida o token', async () => {
  const sessions = new Sessions();
  const token = sessions.create('1');
  const controller = new GetCurrentUserController({ execute: async id => id ? { id } : null });
  const logout = new LogoutUserController(new LogoutUserService(sessions), 'http://localhost:3000');
  const incoming = request({}, `cupcake_session=${token}`, sessions.get(token));
  assert.deepEqual((await controller.handle(incoming, response())).body, { user: { id: '1' } });
  assert.match((await logout.handle(incoming, response())).headers['Set-Cookie'], /Max-Age=0/);
  assert.equal(sessions.get(token), null);
  const anonymous = request({}, `cupcake_session=${token}`, sessions.get(token));
  assert.deepEqual((await controller.handle(anonymous, response())).body, { user: null });
});

test('controllers propagam erros de negócio e parâmetros para os serviços', async () => {
  const expected = new Error('Produto inexistente');
  const list = new ListProductsController({ execute: async () => [] });
  const detail = new GetProductController({ execute: async id => {
    assert.equal(id, '10');
    throw expected;
  } });
  assert.deepEqual((await list.handle({}, response())).body, { products: [] });
  await assert.rejects(detail.handle({ params: { id: '10' } }, response()), error => error === expected);
});

test('middleware libera o IP após a janela sem afetar outro IP', () => {
  let now = 1000;
  const limit = createRateLimiter({ clock: () => now, maximum: 1, windowMilliseconds: 100 });
  const first = { socket: { remoteAddress: '127.0.0.1' } };
  limit(first);
  assert.throws(() => limit(first), error => error.status === 429);
  assert.doesNotThrow(() => limit({ socket: { remoteAddress: '127.0.0.2' } }));
  now += 100;
  assert.doesNotThrow(() => limit(first));
});
