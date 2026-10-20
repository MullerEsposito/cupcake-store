import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCredentials } from '../src/modules/users/entities/credentials.ts';
import { hashPassword, verifyPassword, Sessions } from '../src/infrastructure/security/primitives.ts';

const credentials = (input, registration) => validateCredentials(input, { registration });

test('cadastro normaliza email e recusa credenciais inválidas', () => {
  assert.equal(credentials({ email: ' CLIENTE@EXAMPLE.COM ', password: 'senha-longa-de-teste', name: ' Cliente ' }, true).email, 'cliente@example.com');
  for (const value of [null, 10, {}, 'sem-email']) {
    assert.throws(() => credentials({ email: value, password: 'senha-longa-de-teste', name: 'Cliente' }, true));
  }
  assert.throws(() => credentials({ email: 'cliente@example.com', password: 'curta', name: 'Cliente' }, true));
});

test('scrypt verifica senha e produz salt diferente a cada cadastro', async () => {
  const password = 'senha-longa-de-teste';
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword('outra-senha', first), false);
  assert.equal(await verifyPassword(password, 'HASH_FICTICIO_SEM_LOGIN'), false);
});

test('sessões expiram, são revogáveis e não armazenam tokens em claro', () => {
  const sessions = new Sessions();
  const token = sessions.create('42');
  assert.equal(sessions.get(token), '42');
  assert.equal(sessions.entries.has(token), false);
  sessions.delete(token);
  assert.equal(sessions.get(token), null);
  const expired = new Sessions({ ttl: -1 });
  assert.equal(expired.get(expired.create('42')), null);
});
