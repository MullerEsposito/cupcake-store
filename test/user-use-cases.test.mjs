import { withDataSource } from '../src/infrastructure/typeorm/repository-context.ts';
import { createTypeOrmFixture } from '../test-support/typeorm.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { GetCurrentUserService } from '../src/modules/users/useCases/getCurrentUser/GetCurrentUserService.ts';
import { LogoutUserService } from '../src/modules/users/useCases/logoutUser/LogoutUserService.ts';
import { getAuthenticateUserController } from '../src/modules/users/useCases/authenticateUser/index.ts';

test('consulta da sessão evita consulta sem id e não expõe dados privados', async () => {
  let calls = 0;
  const service = new GetCurrentUserService({ findActiveById: async id => {
    calls++;
    return id === '1' ? { id, name: 'Cliente', email: 'cliente@example.com', role: 'CLIENTE', passwordHash: 'privado' } : null;
  } });
  assert.equal(await service.execute(null), null);
  assert.equal(calls, 0);
  assert.deepEqual(await service.execute('1'), { id: '1', name: 'Cliente', email: 'cliente@example.com', role: 'CLIENTE' });
  assert.equal(await service.execute('inativo'), null);
});

test('logout delega revogação à porta de sessões', () => {
  const revoked = [];
  const service = new LogoutUserService({ delete: token => revoked.push(token) });
  service.execute('token-opaco');
  assert.deepEqual(revoked, ['token-opaco']);
});

test('fábrica de autenticação instancia o serviço sem receber request', async () => {
  const user = { id: '1', name: 'Cliente', email: 'cliente@example.com', role: 'CLIENTE',
    active: true, failedAttempts: 0, blockedUntil: null, passwordHash: 'privado' };
  const tokens = [];
  const dependencies = {
    origin: 'https://cupcake.example',
    dataSource: createTypeOrmFixture({ login: async email => {
      assert.equal(email, user.email);
      return user;
    } }),
    passwords: { verify: async () => true },
    sessions: { create: id => { tokens.push(id); return 'token'; }, delete() {} }
  };
  const controller = withDataSource(dependencies.dataSource, () => getAuthenticateUserController(dependencies));
  const incoming = { body: { email: user.email, password: 'senha' }, headers: {} };
  const outgoing = {
    status(value) { this.statusCode = value; return this; },
    set(name, value) { this.cookie = value; return this; },
    json(value) { this.body = value; return this; }
  };
  await controller.handle(incoming, outgoing);
  assert.equal(outgoing.statusCode, 200);
  assert.deepEqual(outgoing.body, { user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  assert.match(outgoing.cookie, /; Secure$/);
  assert.deepEqual(tokens, ['1']);
});
