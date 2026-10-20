import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createDataSource } from '../src/infrastructure/typeorm/data-source.ts';
import { withDataSource } from '../src/infrastructure/typeorm/repository-context.ts';
import { CartsRepository } from '#repositories/CartsRepository';
import { ProductsRepository } from '#repositories/ProductsRepository';
import { User } from '#entities/User';
import { Category } from '#entities/Category';
import { Product } from '#entities/Product';
import { Cart } from '#entities/Cart';
import { createApp } from '../src/adapters/http/server.ts';
import { Sessions } from '#infrastructure/security/primitives';

const source = createDataSource();
let runner;
try {
  await source.initialize();
  runner = source.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  const suffix = randomBytes(8).toString('hex');
  const category = await runner.manager.getRepository(Category).save({ name: `Sprint 2 ${suffix}`, active: true });
  const user = await runner.manager.getRepository(User).save({ name: 'Teste Sprint 2', email: `${suffix}@example.test`, passwordHash: 'teste-revertido', role: 'CLIENTE', active: true });
  const product = await runner.manager.getRepository(Product).save({ name: `Cupcake ${suffix}`, description: 'Teste revertido',
    categoryId: category.id, price: '0.10', weight: '10.000', image: '/cupcake.svg', stock: 5, active: true });
  const scoped = { isInitialized: true, getRepository: target => runner.manager.getRepository(target) };
  await withDataSource(scoped, async () => {
    const carts = new CartsRepository();
    const guest = { kind: 'guest', id: randomBytes(32).toString('hex') };
    const owner = { kind: 'user', id: user.id };
    assert.equal((await carts.get(guest)).items.length, 0);
    await carts.change(guest, { operation: 'add', productId: product.id, quantity: 2 });
    await carts.change(owner, { operation: 'add', productId: product.id, quantity: 1 });
    const merged = await carts.merge(user.id, guest.id);
    assert.equal(merged.totalQuantity, 3);
    assert.equal(merged.total, '0.30');
    assert.equal((await carts.merge(user.id, guest.id)).totalQuantity, 3);
    assert.equal((await carts.get(guest)).items.length, 0);
    assert.equal((await carts.get({ kind: 'guest', id: randomBytes(32).toString('hex') })).items.length, 0);
    await assert.rejects(carts.change(owner, { operation: 'add', productId: product.id, quantity: 3 }), error => error.code === 'CONFLICT');
    assert.equal((await carts.get(owner)).totalQuantity, 3);
    await carts.change(owner, { operation: 'set', productId: product.id, quantity: 4 });
    assert.equal((await carts.get(owner)).total, '0.40');
    assert.equal((await runner.manager.getRepository(Product).findOneByOrFail({ id: product.id })).stock, 5);
    await carts.change(owner, { operation: 'remove', productId: product.id, quantity: 0 });
    assert.equal((await carts.get(owner)).total, '0.00');
    assert.equal(await runner.manager.getRepository(Cart).countBy({ state: 'ATIVO', userId: user.id }), 1);
    const catalog = new ProductsRepository();
    const filtered = await catalog.listActive({ q: suffix.toUpperCase(), category: category.id, minPrice: '0.09', maxPrice: '0.10' });
    assert.deepEqual(filtered.map(item => item.id), [product.id]);
    assert.equal((await catalog.listActive({ q: '%', category: category.id })).length, 0);
    const sessions = new Sessions();
    const app = createApp({ dataSource: scoped, sessions, passwords: {} }, { origin: 'http://localhost:3000', logger: { error() {} } });
    const server = await new Promise(resolve => {
      const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    });
    try {
      const url = `http://127.0.0.1:${server.address().port}`;
      const empty = await fetch(url + '/api/cart');
      assert.equal(empty.status, 200);
      const cookie = empty.headers.get('set-cookie').split(';')[0];
      assert.match(cookie, /^cupcake_cart=[a-f0-9]{64}$/);
      const post = (path, input, identity = cookie) => fetch(url + path, { method: 'POST', headers: {
        Origin: 'http://localhost:3000', 'X-Cupcake-Request': '1', 'Content-Type': 'application/json', Cookie: identity
      }, body: JSON.stringify(input) });
      const added = await post('/api/cart/items', { productId: product.id, quantity: 2, price: '0.01', userId: 'forjado' });
      assert.equal(added.status, 200);
      assert.equal((await added.json()).cart.total, '0.20');
      assert.equal((await post('/api/cart/items', { productId: product.id, quantity: '2' })).status, 400);
      assert.equal((await post('/api/cart/merge', {})).status, 401);
      const identity = `${cookie}; cupcake_session=${sessions.create(user.id)}`;
      const mergedResponse = await post('/api/cart/merge', {}, identity);
      assert.equal(mergedResponse.status, 200);
      assert.equal((await mergedResponse.json()).cart.totalQuantity, 2);
      assert.match(mergedResponse.headers.get('set-cookie'), /Max-Age=0/);
      assert.equal((await post('/api/cart/merge', {}, identity)).status, 200);
      const invalidFilters = await fetch(url + '/api/products?minPrice=2&maxPrice=1');
      assert.equal(invalidFilters.status, 400);
    } finally {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
    console.log('Sprint 2: filtros, preços, isolamento, incorporação idempotente, quantidade e estoque validados em PostgreSQL.');
  });
} catch (error) {
  console.error('Falha na verificação da Sprint 2:', error.code ?? error.name);
  process.exitCode = 1;
} finally {
  try {
    if (runner?.isTransactionActive) { await runner.rollbackTransaction(); console.log('ROLLBACK executado: dados de teste não persistidos.'); }
  } finally {
    if (runner) await runner.release();
    if (source.isInitialized) await source.destroy();
  }
}
