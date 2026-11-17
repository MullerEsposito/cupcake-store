import assert from 'node:assert/strict';
import test from 'node:test';
import { productStockLabel } from '../client/src/presentation/components/ProductDetails/index.tsx';

test('product details show a low-stock label only for one to four units', () => {
  assert.equal(productStockLabel(0), 'Temporariamente esgotado');
  assert.equal(productStockLabel(1), 'Última unidade');
  for (const stock of [2, 3, 4]) assert.equal(productStockLabel(stock), `Últimos ${stock}`);
  assert.equal(productStockLabel(5), 'Disponível');
  assert.equal(productStockLabel(20), 'Disponível');
});
