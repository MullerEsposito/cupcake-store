import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { ProductsRepository } from '#repositories/ProductsRepository';
import { UsersRepository } from '#repositories/UsersRepository';

test('alias único encontra repositórios de catálogo e usuários em pastas diferentes', () => {
  assert.equal(ProductsRepository.name, 'ProductsRepository');
  assert.equal(UsersRepository.name, 'UsersRepository');
});

test('bundle resolve aliases sem exigir loader no Node', async () => {
  const result = await build({
    absWorkingDir: fileURLToPath(new URL('../', import.meta.url)),
    entryPoints: ['src/main.ts'],
    tsconfig: 'tsconfig.server.json',
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    keepNames: true,
    write: false
  });
  assert.equal(result.errors.length, 0);
  assert.doesNotMatch(result.outputFiles[0].text, /from ['"]#(?:repositories|http|shared|infrastructure)\//);
  assert.match(result.outputFiles[0].text, /from ["']typeorm["']/);
});
