import test from 'node:test';
import assert from 'node:assert/strict';
import { withDataSource } from '../src/infrastructure/typeorm/repository-context.ts';
import { AppDataSource } from '../src/infrastructure/typeorm/data-source.ts';
import { ProductsRepository } from '#repositories/ProductsRepository';
import { UsersRepository } from '#repositories/UsersRepository';
import { createTypeOrmFixture } from '../test-support/typeorm.mjs';

test('construtores sem parâmetros falham antes da conexão ser inicializada', () => {
  assert.equal(AppDataSource.isInitialized, false);
  for (const create of [() => new ProductsRepository(), () => new UsersRepository()]) {
    assert.throws(create, error => error.code === 'UNAVAILABLE');
    assert.throws(() => withDataSource({ isInitialized: false }, create), error => error.code === 'UNAVAILABLE');
  }
});

test('conexões de contextos assíncronos concorrentes não se misturam', async () => {
  const first = createTypeOrmFixture({ products: async () => [{ id: 'primeiro' }] });
  const second = createTypeOrmFixture({ products: async () => [{ id: 'segundo' }] });
  const result = await Promise.all([first, second].map(source => withDataSource(source, async () => {
    await new Promise(resolve => setImmediate(resolve));
    return new ProductsRepository().listActive();
  })));
  assert.deepEqual(result, [[{ id: 'primeiro' }], [{ id: 'segundo' }]]);
  assert.throws(() => new ProductsRepository(), error => error.code === 'UNAVAILABLE');
});

test('contextos aninhados restauram a conexão anterior após exceção', async () => {
  const first = createTypeOrmFixture({ products: async () => [{ id: 'externo' }] });
  const second = createTypeOrmFixture();
  const result = await withDataSource(first, async () => {
    assert.throws(() => withDataSource(second, () => { throw new Error('falha controlada'); }), /falha controlada/);
    return new ProductsRepository().listActive();
  });
  assert.deepEqual(result, [{ id: 'externo' }]);
});
