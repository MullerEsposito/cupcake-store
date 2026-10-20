import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { authenticatedResponse } from '#http/helpers/authenticated-response';
import { readSessionToken, sessionCookie } from '#http/helpers/session-cookie';
import { jsonBody } from '#http/helpers/request-body';
import { errorHandler } from '#http/helpers/response';

test('helpers HTTP ficam na pasta dedicada sem cópias antigas', async () => {
  const root = new URL('../src/adapters/http/', import.meta.url);
  const originalFiles = await readdir(root);
  const helpers = await readdir(new URL('helpers/', root));
  for (const name of ['authenticated-response.ts', 'session-cookie.ts', 'request-body.ts', 'response.ts']) {
    assert.ok(helpers.includes(name), name);
    assert.ok(!originalFiles.includes(name), name);
  }
  for (const name of ['server.ts', 'contracts.ts', 'dependencies.ts', 'http-error.ts']) {
    assert.ok(originalFiles.includes(name), name);
  }
});

test('alias HTTP resolve os helpers e preserva o contrato dos cookies', () => {
  for (const helper of [authenticatedResponse, jsonBody, errorHandler]) {
    assert.equal(typeof helper, 'function');
  }
  assert.equal(readSessionToken({ headers: { cookie: 'other=1; cupcake_session=token' } }), 'token');
  assert.match(sessionCookie('token', 'https://localhost'), /HttpOnly; SameSite=Strict; Path=\//);
  assert.match(sessionCookie('token', 'https://localhost'), /; Secure$/);
});
