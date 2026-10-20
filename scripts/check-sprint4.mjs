import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createDataSource } from '../src/infrastructure/typeorm/data-source.ts';
import { withDataSource } from '../src/infrastructure/typeorm/repository-context.ts';
import { AdministrationRepository } from '../src/modules/admin/repositories/implementations/typeorm/AdministrationRepository.ts';
import { AddressesRepository } from '../src/modules/addresses/repositories/implementations/typeorm/AddressesRepository.ts';
import { OrdersRepository } from '../src/modules/orders/repositories/implementations/typeorm/OrdersRepository.ts';
import { CartsRepository } from '#repositories/CartsRepository';
import { User } from '#entities/User';
import { Product } from '#entities/Product';
import { Order } from '#entities/Order';
import { createApp } from '../src/adapters/http/server.ts';
import { Sessions } from '#infrastructure/security/primitives';

const source = createDataSource();
let runner;
try {
  await source.initialize();
  runner = source.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  const suffix = randomUUID();
  const users = [];
  for (const role of ['ADMIN', 'CLIENTE', 'CLIENTE']) users.push(await runner.manager.save(User, {
    name: `Teste Sprint 4 ${users.length}`, email: `${users.length}-${suffix}@example.test`, passwordHash: 'teste-revertido', role, active: true
  }));
  const [administrator, buyer, other] = users;
  const scoped = { isInitialized: true, getRepository: target => runner.manager.getRepository(target) };
  await withDataSource(scoped, async () => {
    const admin = new AdministrationRepository();
    const orders = new OrdersRepository();
    const carts = new CartsRepository();
    const addresses = new AddressesRepository();
    await assert.rejects(admin.catalog(buyer.id, { page: 1 }), error => error.code === 'FORBIDDEN');
    const category = await admin.saveCategory(administrator.id, undefined, { name: `Categoria ${suffix}`, description: null, active: true });
    const input = { categoryId: category.id, name: `Cupcake ${suffix}`, description: 'Teste revertido', price: '1.20',
      weight: '85.000', image: '/cupcake.svg', active: true, initialStock: 5 };
    const created = await admin.saveProduct(administrator.id, undefined, input);
    const { initialStock, ...fields } = input;
    const edited = await admin.saveProduct(administrator.id, created.id, { ...fields, name: `Editado ${suffix}`, revision: created.revision });
    assert.equal(edited.stock, 5);
    assert.notEqual(edited.revision, created.revision);
    await assert.rejects(admin.saveProduct(administrator.id, created.id, { ...fields, revision: created.revision }), error => error.code === 'CONFLICT');
    await assert.rejects(admin.saveCategory(administrator.id, category.id, { ...category, active: false }), error => error.code === 'CONFLICT');
    const adjusted = await admin.adjustStock(administrator.id, created.id, { expectedStock: 5, delta: 4 });
    assert.equal(adjusted.stock, 9);
    assert.equal(adjusted.revision, edited.revision);
    await assert.rejects(admin.adjustStock(administrator.id, created.id, { expectedStock: 5, delta: 4 }), error => error.code === 'CONFLICT');
    await assert.rejects(admin.adjustStock(administrator.id, created.id, { expectedStock: 9, delta: -10 }), error => error.code === 'CONFLICT');
    const catalog = await admin.catalog(administrator.id, { page: 1 });
    assert.equal(catalog.products.items.find(item => item.id === created.id).stock, 9);
    assert.equal(catalog.products.pageSize, 20);

    const address = await addresses.create(buyer.id, { recipient: 'Comprador fictício', postalCode: '01001000', street: 'Rua Teste',
      number: '10', complement: null, district: 'Centro', city: 'São Paulo', state: 'SP' });
    await carts.change({ kind: 'user', id: buyer.id }, { operation: 'add', productId: created.id, quantity: 2 });
    const checkout = { addressId: address.id, method: 'PIX', expectedSubtotal: '2.40', idempotencyKey: randomUUID() };
    const order = await orders.checkout(buyer.id, checkout);
    await assert.rejects(orders.find(other.id, order.id), error => error.code === 'NOT_FOUND');
    await assert.rejects(admin.advanceOrder(administrator.id, order.id, { expectedStatus: 'PAGAMENTO_APROVADO', status: 'EM_PREPARACAO' }), error => error.code === 'CONFLICT');
    await runner.manager.update(Order, { id: order.id }, { status: 'PAGAMENTO_APROVADO' });
    await assert.rejects(admin.advanceOrder(administrator.id, order.id, { expectedStatus: 'PAGAMENTO_APROVADO', status: 'EM_PREPARACAO' }), error => error.code === 'CONFLICT');
    await runner.manager.update(Order, { id: order.id }, { status: 'AGUARDANDO_PAGAMENTO' });
    await orders.pay(buyer.id, order.id, { method: 'PIX', outcome: 'APROVADO', idempotencyKey: checkout.idempotencyKey });
    assert.equal((await runner.manager.findOneByOrFail(Product, { id: created.id })).stock, 7);
    await assert.rejects(admin.adjustStock(administrator.id, created.id, { expectedStock: 9, delta: 1 }), error => error.code === 'CONFLICT');
    await assert.rejects(admin.advanceOrder(buyer.id, order.id, { expectedStatus: 'PAGAMENTO_APROVADO', status: 'EM_PREPARACAO' }), error => error.code === 'FORBIDDEN');
    const preparation = { expectedStatus: 'PAGAMENTO_APROVADO', status: 'EM_PREPARACAO' };
    assert.equal((await admin.advanceOrder(administrator.id, order.id, preparation)).status, 'EM_PREPARACAO');
    assert.equal((await admin.advanceOrder(administrator.id, order.id, preparation)).status, 'EM_PREPARACAO');
    await assert.rejects(admin.advanceOrder(administrator.id, order.id, { expectedStatus: 'EM_PREPARACAO', status: 'ENTREGUE' }), error => error.code === 'CONFLICT');
    await admin.advanceOrder(administrator.id, order.id, { expectedStatus: 'EM_PREPARACAO', status: 'SAIU_PARA_ENTREGA' });
    await assert.rejects(admin.advanceOrder(administrator.id, order.id, preparation), error => error.code === 'CONFLICT');
    await admin.advanceOrder(administrator.id, order.id, { expectedStatus: 'SAIU_PARA_ENTREGA', status: 'ENTREGUE' });
    assert.equal((await orders.find(buyer.id, order.id)).status, 'ENTREGUE');
    assert.equal((await runner.manager.findOneByOrFail(Product, { id: created.id })).stock, 7);
    const filtered = await admin.orders(administrator.id, { page: 1, status: 'ENTREGUE' });
    const found = filtered.items.find(item => item.id === order.id);
    assert.equal(found.customer.id, buyer.id);
    assert.equal('passwordHash' in found.customer, false);
    assert.equal((await orders.list(other.id)).length, 0);

    const disabled = await admin.saveProduct(administrator.id, created.id, { ...fields, active: false, revision: edited.revision });
    assert.equal(disabled.stock, 7);
    const disabledCategory = await admin.saveCategory(administrator.id, category.id, { name: category.name, description: null, active: false, revision: category.revision });
    await assert.rejects(admin.saveProduct(administrator.id, created.id, { ...fields, active: true, revision: disabled.revision }), error => error.code === 'CONFLICT');
    assert.equal(disabledCategory.active, false);

    const sessions = new Sessions();
    const adminCookie = `cupcake_session=${sessions.create(administrator.id)}`;
    const buyerCookie = `cupcake_session=${sessions.create(buyer.id)}`;
    const otherCookie = `cupcake_session=${sessions.create(other.id)}`;
    const app = createApp({ dataSource: scoped, sessions, passwords: {} }, { logger: { error() {} } });
    const server = await new Promise(resolve => { const listening = app.listen(0, '127.0.0.1', () => resolve(listening)); });
    try {
      const url = `http://127.0.0.1:${server.address().port}`;
      const get = (path, cookie) => fetch(url + path, { headers: { Cookie: cookie } });
      const post = (path, body, cookie = adminCookie) => fetch(url + path, { method: 'POST', headers: {
        Origin: 'http://localhost:3000', 'X-Cupcake-Request': '1', 'Content-Type': 'application/json', Cookie: cookie
      }, body: JSON.stringify(body) });
      assert.equal((await get('/api/admin/catalog', '')).status, 401);
      assert.equal((await get('/api/admin/catalog', buyerCookie)).status, 403);
      assert.equal((await get('/api/admin/catalog?page=1', adminCookie)).status, 200);
      assert.equal((await get('/api/admin/orders?status=ENTREGUE', adminCookie)).status, 200);
      const details = await get(`/api/orders/${order.id}`, buyerCookie);
      assert.equal(details.status, 200);
      assert.equal((await details.json()).order.status, 'ENTREGUE');
      assert.equal((await get(`/api/orders/${order.id}`, otherCookie)).status, 404);
      assert.equal((await post('/api/admin/products', { ...input, role: 'ADMIN' })).status, 400);
      const categoryResponse = await post('/api/admin/categories', { name: `HTTP ${suffix}`, description: null, active: true });
      assert.equal(categoryResponse.status, 200);
      const httpCategory = (await categoryResponse.json()).category;
      const productResponse = await post('/api/admin/products', { ...input, categoryId: httpCategory.id, initialStock: 0 });
      assert.equal(productResponse.status, 200);
      const httpProduct = (await productResponse.json()).product;
      const stockResponse = await post(`/api/admin/products/${httpProduct.id}/stock`, { expectedStock: 0, delta: 3 });
      assert.equal(stockResponse.status, 200);
      assert.equal((await stockResponse.json()).product.stock, 3);
      const editResponse = await post(`/api/admin/products/${httpProduct.id}`, { ...fields, categoryId: httpCategory.id,
        name: `HTTP editado ${suffix}`, revision: httpProduct.revision });
      assert.equal(editResponse.status, 200);
      assert.equal((await editResponse.json()).product.stock, 3);
      assert.equal((await post(`/api/admin/orders/${order.id}/status`, { expectedStatus: 'SAIU_PARA_ENTREGA', status: 'ENTREGUE' })).status, 200);
      await runner.manager.update(User, { id: administrator.id }, { role: 'CLIENTE' });
      assert.equal((await get('/api/admin/catalog', adminCookie)).status, 403);
      await assert.rejects(admin.catalog(administrator.id, { page: 1 }), error => error.code === 'FORBIDDEN');
      await runner.manager.update(User, { id: administrator.id }, { active: false });
      assert.equal((await get('/api/admin/orders', adminCookie)).status, 401);
    } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    console.log('Sprint 4: autorização, catálogo, revisões, estoque, estados e acompanhamento do proprietário validados no PostgreSQL.');
  });
} catch (error) {
  console.error('Falha na verificação da Sprint 4:', error.code ?? error.name);
  if (error.name === 'AssertionError') console.error(error.message);
  process.exitCode = 1;
} finally {
  try {
    if (runner?.isTransactionActive) { await runner.rollbackTransaction(); console.log('ROLLBACK: dados fictícios e perfil ADMIN de teste não persistidos.'); }
  } finally {
    if (runner) await runner.release();
    if (source.isInitialized) await source.destroy();
  }
}
