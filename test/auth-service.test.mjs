import { withDataSource } from '../src/infrastructure/typeorm/repository-context.ts';
import { User } from '../src/modules/users/entities/User.ts';
import { createTypeOrmFixture } from '../test-support/typeorm.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthenticateUserService } from '../src/modules/users/useCases/authenticateUser/AuthenticateUserService.ts';
import { RegisterUserService } from '../src/modules/users/useCases/registerUser/RegisterUserService.ts';
import { UsersRepository } from '#repositories/UsersRepository';

import { Sessions } from '../src/infrastructure/security/primitives.ts';

const createAuthenticateUserService = ({ users, passwords, sessions = new Sessions(), clock }) => new AuthenticateUserService(users, passwords, sessions, clock);
const createRegisterUserService = ({ users, passwords, sessions = new Sessions() }) => new RegisterUserService(users, passwords, sessions);

const now = 1800000000000;
const baseUser = { id: '1', name: 'Cliente', email: 'cliente@example.com', role: 'CLIENTE', active: true, failedAttempts: 0, blockedUntil: null, passwordHash: 'hash' };
const input = { email: 'cliente@example.com', password: 'senha-correta-longa' };

function fixture(changes = {}, matches = true) {
  const writes = [];
  const user = { ...baseUser, ...changes };
  return { writes, service: createAuthenticateUserService({
    users: { withLockedUser: async (email, operation) => operation(user, async (id, state) => writes.push({ id, state })) },
    passwords: { verify: async () => matches }, clock: () => now
  }) };
}

test('quinta falha persiste bloqueio e retorna erro de domínio', async () => {
  const { service, writes } = fixture({ failedAttempts: 4 }, false);
  await assert.rejects(service.execute(input), error => error.code === 'RATE_LIMIT');
  assert.equal(writes[0].state.failedAttempts, 5);
  assert.equal(writes[0].state.blockedUntil.getTime(), now + 900000);
});

test('conta bloqueada não entra nem altera contagem', async () => {
  const { service, writes } = fixture({ failedAttempts: 5, blockedUntil: new Date(now + 60000) });
  await assert.rejects(service.execute(input), error => error.code === 'RATE_LIMIT');
  assert.equal(writes.length, 0);
});

test('bloqueio expirado inicia nova contagem em uma falha', async () => {
  const { service, writes } = fixture({ failedAttempts: 5, blockedUntil: new Date(now - 1) }, false);
  await assert.rejects(service.execute(input), error => error.code === 'UNAUTHORIZED');
  assert.deepEqual(writes[0].state, { failedAttempts: 1, blockedUntil: null });
});

test('login válido limpa tentativas e não expõe credenciais', async () => {
  const { service, writes } = fixture({ failedAttempts: 2 });
  const { user } = await service.execute(input);
  assert.deepEqual(writes[0].state, { failedAttempts: 0, blockedUntil: null });
  assert.deepEqual(Object.keys(user), ['id', 'name', 'email', 'role']);
});

test('cadastro remove perfil enviado e depende apenas das portas', async () => {
  let captured;
  const service = createRegisterUserService({ users: { createClient: async value => { captured = value; return baseUser; } }, passwords: { hash: async () => 'hash-seguro' } });
  await service.execute({ ...input, name: 'Cliente', perfil: 'ADMIN', role: 'ADMIN' });
  assert.deepEqual(captured, { name: 'Cliente', email: input.email, passwordHash: 'hash-seguro' });
});

test('repositório confirma tentativa antes do serviço lançar erro e usa manager transacional', async () => {
  const dataSource = createTypeOrmFixture({ login: async () => ({ ...baseUser, failedAttempts: 4 }) });
  const ormRepository = dataSource.getRepository(User);
  const usersRepository = withDataSource(dataSource, () => new UsersRepository());
  ormRepository.createQueryBuilder = () => { throw new Error('Não usar repository global em transação'); };
  dataSource.getRepository = () => { throw new Error('Não usar manager global em transação'); };
  const service = createAuthenticateUserService({
    users: usersRepository, passwords: { verify: async () => false }, clock: () => now
  });
  await assert.rejects(service.execute(input), error => error.code === 'RATE_LIMIT');
  assert.ok(dataSource.events.some(entry => entry.type === 'lock' && entry.mode === 'pessimistic_write'));
  assert.deepEqual(dataSource.writes[0], { id: '1', state: { failedAttempts: 5, blockedUntil: new Date(now + 900000) } });
  assert.deepEqual(dataSource.events.slice(-2).map(entry => entry.type), ['COMMIT', 'RELEASE']);
  assert.equal(dataSource.events.find(entry => entry.type === 'update').scope, 'transaction');
});

test('erro inesperado reverte a transação TypeORM e libera o recurso', async () => {
  const dataSource = createTypeOrmFixture({ login: async () => { throw new Error('falha controlada'); } });
  const repository = withDataSource(dataSource, () => new UsersRepository());
  await assert.rejects(repository.withLockedUser(input.email, async () => {}), /falha controlada/);
  assert.deepEqual(dataSource.events.slice(-2).map(entry => entry.type), ['ROLLBACK', 'RELEASE']);
  assert.equal(dataSource.events.some(entry => entry.type === 'COMMIT'), false);
});
