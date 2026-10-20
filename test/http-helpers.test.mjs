import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { authenticatedResponse } from '#http/helpers/authenticated-response';
import { readSessionToken, sessionCookie } from '#http/helpers/session-cookie';
import { jsonBody } from '#http/helpers/request-body';
import { errorHandler } from '#http/helpers/response';
import { HttpError } from '#http/errors/http-error';

test('helpers HTTP ficam na pasta dedicada sem cópias antigas', async () => {
  const root = new URL('../src/adapters/http/', import.meta.url);
  const originalFiles = await readdir(root);
  const helpers = await readdir(new URL('helpers/', root));
  const errors = await readdir(new URL('errors/', root));
  assert.ok(errors.includes('http-error.ts'));
  assert.ok(!originalFiles.includes('http-error.ts'));
  assert.ok(!helpers.includes('http-error.ts'));
  for (const name of ['authenticated-response.ts', 'session-cookie.ts', 'request-body.ts', 'response.ts']) {
    assert.ok(helpers.includes(name), name);
    assert.ok(!originalFiles.includes(name), name);
  }
  for (const name of ['server.ts', 'contracts.ts', 'dependencies.ts']) {
    assert.ok(originalFiles.includes(name), name);
  }
});

test('alias HTTP resolve os helpers e preserva o contrato dos cookies', () => {
  for (const helper of [authenticatedResponse, jsonBody, errorHandler]) {
    assert.equal(typeof helper, 'function');
  }
  const error = new HttpError(403, 'Origem inválida');
  assert.ok(error instanceof Error);
  assert.equal(error.status, 403);
  assert.equal(error.name, 'HttpError');
  assert.equal(readSessionToken({ headers: { cookie: 'other=1; cupcake_session=token' } }), 'token');
  assert.match(sessionCookie('token', 'https://localhost'), /HttpOnly; SameSite=Strict; Path=\//);
  assert.match(sessionCookie('token', 'https://localhost'), /; Secure$/);
});
