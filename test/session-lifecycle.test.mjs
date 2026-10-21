import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthenticateUserService } from '#users-usecases/authenticateUser/AuthenticateUserService';
import { RegisterUserService } from '#users-usecases/registerUser/RegisterUserService';
import { resolveSession } from '#http/middlewares/resolve-session';
import { Sessions } from '#infrastructure/security/primitives';

const user = {
  id: '1', name: 'Cliente', email: 'cliente@example.com', role: 'CLIENTE',
  active: true, failedAttempts: 0, blockedUntil: null, passwordHash: 'privado'
};
const credentials = { name: user.name, email: user.email, password: 'senha-longa-de-teste' };

for (const Service of [RegisterUserService, AuthenticateUserService]) {
  test(`${Service.name} cria e rotaciona a sessão somente após persistir o resultado`, async () => {
    const sessions = new Sessions();
    const previous = sessions.create('anterior');
    let persisted = false;
    const users = {
      createClient: async () => { persisted = true; return user; },
      withLockedUser: async (email, operation) => {
        const result = await operation(user, async () => {});
        persisted = true;
        return result;
      }
    };
    const sessionPort = {
      create: id => { assert.equal(persisted, true); return sessions.create(id); },
      delete: token => sessions.delete(token)
    };
    const service = new Service(users, { hash: async () => 'hash', verify: async () => true }, sessionPort);
    const result = await service.execute(credentials, previous);
    assert.equal(sessions.get(previous), null);
    assert.equal(sessions.get(result.token), user.id);
    assert.deepEqual(result.user, { id: user.id, name: user.name, email: user.email, role: user.role });
    assert.equal('passwordHash' in result.user, false);
  });

  test(`${Service.name} preserva sessão anterior se o armazenamento estiver cheio`, async () => {
    const sessions = new Sessions({ max: 1 });
    const previous = sessions.create('anterior');
    const users = {
      createClient: async () => user,
      withLockedUser: async (email, operation) => operation(user, async () => {})
    };
    const service = new Service(users, { hash: async () => 'hash', verify: async () => true }, sessions);
    await assert.rejects(service.execute(credentials, previous), error => error.code === 'UNAVAILABLE');
    assert.equal(sessions.get(previous), 'anterior');
    assert.equal(sessions.entries.size, 1);
  });
}

test('login inválido ou bloqueado não cria sessão nem revoga a anterior', async () => {
  for (const account of [user, { ...user, blockedUntil: new Date(Date.now() + 60000) }, null]) {
    const events = [];
    const service = new AuthenticateUserService({
      withLockedUser: async (email, operation) => operation(account, async () => {})
    }, { verify: async () => false }, {
      create: () => { events.push('create'); return 'novo'; },
      delete: () => events.push('delete')
    });
    await assert.rejects(service.execute(credentials, 'anterior'), error => ['UNAUTHORIZED', 'RATE_LIMIT'].includes(error.code));
    assert.deepEqual(events, []);
  }
});

test('falha na confirmação da transação não emite sessão', async () => {
  const events = [];
  const expected = new Error('Falha ao confirmar');
  const service = new AuthenticateUserService({
    withLockedUser: async (email, operation) => {
      await operation(user, async () => {});
      throw expected;
    }
  }, { verify: async () => true }, {
    create: () => { events.push('create'); return 'novo'; },
    delete: () => events.push('delete')
  });
  await assert.rejects(service.execute(credentials, 'anterior'), error => error === expected);
  assert.deepEqual(events, []);
});

test('middleware identifica pelo cookie e ignora identidade fornecida pelo cliente', async () => {
  const sessions = new Sessions();
  const token = sessions.create('real');
  const request = {
    headers: { cookie: `cupcake_session=${token}` },
    body: { userId: 'forjado' }, query: { userId: 'forjado' },
    authentication: { userId: 'forjado' },
    app: { locals: { dependencies: { sessions } } }
  };
  let calls = 0;
  await resolveSession(request, {}, () => { calls++; });
  assert.deepEqual(request.authentication, { token, userId: 'real' });
  assert.equal(calls, 1);
});

test('middleware trata cookies ausentes, inválidos, expirados e de outra aplicação como anônimos', async () => {
  const sessions = new Sessions();
  const expired = new Sessions({ ttl: -1 });
  const expiredToken = expired.create('1');
  const foreign = new Sessions().create('outra-aplicacao');
  for (const [store, token] of [[sessions, undefined], [sessions, 'invalido'], [expired, expiredToken], [sessions, foreign]]) {
    const request = {
      headers: { cookie: token ? `cupcake_session=${token}` : undefined },
      app: { locals: { dependencies: { sessions: store } } }
    };
    await resolveSession(request, {}, () => {});
    assert.deepEqual(request.authentication, { token, userId: null });
  }
});
