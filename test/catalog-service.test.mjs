import test from 'node:test';
import assert from 'node:assert/strict';
import { ListProductsService } from '../src/modules/catalog/useCases/listProducts/ListProductsService.ts';
import { GetProductService } from '../src/modules/catalog/useCases/getProduct/GetProductService.ts';

test('catálogo mantém ausência de dados e rejeita ids inválidos antes do repositório', async () => {
  let calls = 0;
  const products = { listActive: async () => [], findActiveById: async () => { calls++; return null; } };
  const list = new ListProductsService(products);
  const detail = new GetProductService(products);
  assert.deepEqual(await list.execute(), []);
  await assert.rejects(detail.execute('1 OR 1=1'), error => error.code === 'NOT_FOUND');
  assert.equal(calls, 0);
  await assert.rejects(detail.execute('10'), error => error.code === 'NOT_FOUND');
  assert.equal(calls, 1);
});
