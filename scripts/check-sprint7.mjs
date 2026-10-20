import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createDataSource } from '../src/infrastructure/typeorm/data-source.ts';
import { withDataSource } from '../src/infrastructure/typeorm/repository-context.ts';
import { AdministrationRepository } from '../src/modules/admin/repositories/implementations/typeorm/AdministrationRepository.ts';
import { InventoryRepository } from '../src/modules/inventory/repositories/implementations/typeorm/InventoryRepository.ts';
import { OrdersRepository } from '../src/modules/orders/repositories/implementations/typeorm/OrdersRepository.ts';
import { AddressesRepository } from '../src/modules/addresses/repositories/implementations/typeorm/AddressesRepository.ts';
import { CartsRepository } from '#repositories/CartsRepository';
import { User } from '#entities/User';
import { Product } from '#entities/Product';
import { Payment } from '#entities/Payment';
import { OrderCancellation } from '#entities/OrderCancellation';
import { StockMovement } from '#entities/StockMovement';
import { createApp } from '../src/adapters/http/server.ts';
import { Sessions } from '../src/infrastructure/security/primitives.ts';

const source = createDataSource();
let runner;
try {
  await source.initialize();
  assert.equal(await source.showMigrations(), false, 'Execute npm run migrate antes do diagnóstico.');
  runner = source.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  const suffix = randomUUID();
  const adminUser = await runner.manager.save(User, { name: 'Administrador fictício Sprint 7', email: `admin-${suffix}@example.test`, passwordHash: 'teste-revertido', role: 'ADMIN', active: true });
  const buyer = await runner.manager.save(User, { name: 'Cliente fictício Sprint 7', email: `buyer-${suffix}@example.test`, passwordHash: 'teste-revertido', role: 'CLIENTE', active: true });
  const scoped = { isInitialized: true, getRepository: target => runner.manager.getRepository(target) };
  await withDataSource(scoped, async () => {
    const admin = new AdministrationRepository();
    const inventory = new InventoryRepository();
    const orders = new OrdersRepository();
    const carts = new CartsRepository();
    const addresses = new AddressesRepository();
    const category = await admin.saveCategory(adminUser.id, undefined, { name: `Auditoria ${suffix}`, description: null, active: true });
    const fields = { categoryId: category.id, name: `Cupcake auditoria ${suffix}`, description: 'Dados fictícios revertidos', price: '1.00', weight: '85.000', image: '/cupcake.svg', active: true };
    const product = await admin.saveProduct(adminUser.id, undefined, { ...fields, initialStock: 30 });
    const stock = async () => (await runner.manager.findOneByOrFail(Product, { id: product.id })).stock;
    const movements = () => runner.manager.find(StockMovement, { where: { productId: product.id }, order: { id: 'ASC' } });
    const adjust = (expectedStock, delta) => admin.adjustStock(adminUser.id, product.id, { expectedStock, delta, reason: 'Ajuste fictício revertido da Sprint 7' });
    const initial = await movements();
    assert.equal(initial.length, 1);
    assert.equal(initial[0].type, 'INICIALIZACAO');
    assert.equal(initial[0].actorId, adminUser.id);
    assert.equal(initial[0].currentStock, 30);
    const zero = await admin.saveProduct(adminUser.id, undefined, { ...fields, name: `Zero ${suffix}`, initialStock: 0 });
    assert.equal((await runner.manager.findOneByOrFail(StockMovement, { productId: zero.id })).quantity, 0);
    await adjust(30, 5);
    await adjust(35, -2);
    assert.equal(await stock(), 33);
    await assert.rejects(adjust(30, 1), error => error.code === 'CONFLICT');
    assert.equal((await movements()).length, 3);

    const address = await addresses.create(buyer.id, { recipient: 'Cliente fictício', postalCode: '01001000', street: 'Rua de teste', number: '1', complement: null, district: 'Centro', city: 'São Paulo', state: 'SP' });
    async function makeOrder(quantity = 3) {
      await carts.change({ kind: 'user', id: buyer.id }, { operation: 'add', productId: product.id, quantity });
      const key = randomUUID();
      const order = await orders.checkout(buyer.id, { addressId: address.id, method: 'PIX', expectedSubtotal: `${quantity}.00`, idempotencyKey: key });
      return { order, input: { method: 'PIX', outcome: 'APROVADO', idempotencyKey: key } };
    }
    const paid = await makeOrder();
    const approved = await orders.pay(buyer.id, paid.order.id, paid.input);
    await orders.pay(buyer.id, paid.order.id, paid.input);
    assert.equal(await stock(), 30);
    assert.equal(await runner.manager.countBy(StockMovement, { orderId: paid.order.id, type: 'VENDA' }), 1);
    const cancel = { reason: 'Cancelamento fictício da Sprint 7', expectedStatus: 'PAGAMENTO_APROVADO', idempotencyKey: randomUUID() };
    await orders.cancel(buyer.id, paid.order.id, cancel);
    await orders.cancel(buyer.id, paid.order.id, cancel);
    assert.equal(await stock(), 33);
    const returned = await runner.manager.findOneByOrFail(StockMovement, { orderId: paid.order.id, type: 'DEVOLUCAO' });
    assert.equal(returned.paymentId, approved.payments[0].id);
    assert.equal(returned.actorId, buyer.id);
    assert.equal(returned.origin, 'SISTEMA');
    assert.equal(returned.quantity, 3);
    assert.ok(returned.cancellationId);
    const unpaid = await makeOrder(1);
    await orders.pay(buyer.id, unpaid.order.id, { ...unpaid.input, outcome: 'RECUSADO' });
    await orders.cancel(buyer.id, unpaid.order.id, { ...cancel, expectedStatus: 'AGUARDANDO_PAGAMENTO', idempotencyKey: randomUUID() });
    assert.equal(await runner.manager.countBy(StockMovement, { orderId: unpaid.order.id }), 0);

    const injected = new Error('Falha controlada ao gravar auditoria');
    function wrapManager(manager) {
      return new Proxy(manager, { get(target, property) {
        if (property === 'transaction') return (...args) => {
          const operation = args.pop();
          return target.transaction(...args, transactional => operation(wrapManager(transactional)));
        };
        if (property === 'save') return (entity, values) => {
          if (entity === StockMovement) throw injected;
          return target.save(entity, values);
        };
        const value = Reflect.get(target, property);
        return typeof value === 'function' ? value.bind(target) : value;
      } });
    }
    const brokenSource = { isInitialized: true, getRepository: target => ({ ...runner.manager.getRepository(target), manager: wrapManager(runner.manager) }) };
    const brokenAdmin = withDataSource(brokenSource, () => new AdministrationRepository());
    const brokenOrders = withDataSource(brokenSource, () => new OrdersRepository());
    const beforeFailure = (await movements()).length;
    await assert.rejects(brokenAdmin.adjustStock(adminUser.id, product.id, { expectedStock: 33, delta: 1, reason: 'Ajuste que deve reverter' }), error => error === injected);
    assert.equal(await stock(), 33);
    assert.equal((await movements()).length, beforeFailure);
    await assert.rejects(brokenAdmin.saveProduct(adminUser.id, undefined, { ...fields, name: `Não persistir ${suffix}`, initialStock: 2 }), error => error === injected);
    assert.equal(await runner.manager.countBy(Product, { name: `Não persistir ${suffix}` }), 0);
    const retry = await makeOrder(1);
    await assert.rejects(brokenOrders.pay(buyer.id, retry.order.id, retry.input), error => error === injected);
    assert.equal(await stock(), 33);
    assert.equal((await orders.find(buyer.id, retry.order.id)).status, 'AGUARDANDO_PAGAMENTO');
    assert.equal((await runner.manager.findOneByOrFail(Payment, { idempotencyKey: retry.input.idempotencyKey })).status, 'PENDENTE');
    await orders.pay(buyer.id, retry.order.id, retry.input);
    await assert.rejects(brokenOrders.cancel(buyer.id, retry.order.id, { ...cancel, idempotencyKey: randomUUID() }), error => error === injected);
    assert.equal(await stock(), 32);
    assert.equal(await runner.manager.countBy(OrderCancellation, { orderId: retry.order.id }), 0);
    await orders.cancelAsAdministrator(adminUser.id, retry.order.id, { ...cancel, idempotencyKey: randomUUID() });
    assert.equal(await stock(), 33);

    const sale = await runner.manager.findOneByOrFail(StockMovement, { orderId: paid.order.id, type: 'VENDA' });
    await assert.rejects(runner.manager.transaction(manager => manager.save(StockMovement, { ...sale, id: undefined })), error => error.code === '23505');
    await assert.rejects(runner.manager.transaction(manager => manager.update(StockMovement, { id: sale.id }, { reason: 'Não deve alterar' })), error => error.code === '23514');
    await assert.rejects(runner.manager.transaction(manager => manager.delete(StockMovement, { id: sale.id })), error => error.code === '23514');
    await assert.rejects(runner.manager.transaction(manager => manager.query('TRUNCATE public.movimentacao_estoque')), error => error.code === '23514');
    await assert.rejects(runner.manager.transaction(manager => manager.save(StockMovement, { ...initial[0], id: undefined, type: 'REPOSICAO', quantity: 1, previousStock: 0, currentStock: 2 })), error => error.code === '23514');
    for (let index = 0; index < 22; index++) await adjust(await stock(), 1);
    const page1 = await inventory.list(adminUser.id, { page: 1, productId: product.id });
    const page2 = await inventory.list(adminUser.id, { page: 2, productId: product.id });
    assert.equal(page1.items.length, 20);
    assert.ok(page2.items.length > 0);
    assert.equal(new Set([...page1.items, ...page2.items].map(item => item.id)).size, page1.total);
    assert.equal((await inventory.list(adminUser.id, { page: 1, productId: product.id, type: 'VENDA', actorId: buyer.id })).total, 2);
    assert.equal((await inventory.list(adminUser.id, { page: 1, productId: product.id, orderId: paid.order.id })).total, 2);
    assert.equal((await inventory.list(adminUser.id, { page: 1, productId: product.id, from: '2000-01-01', to: '2000-01-01' })).total, 0);
    await admin.saveProduct(adminUser.id, product.id, { ...fields, name: `Renomeado ${suffix}`, active: false, revision: product.revision });
    assert.equal((await inventory.list(adminUser.id, { page: 1, productId: product.id })).total, page1.total);
    const chain = await movements();
    let previous = 0;
    for (const movement of chain) {
      assert.equal(movement.previousStock, previous);
      assert.equal(movement.currentStock, movement.previousStock + movement.quantity);
      previous = movement.currentStock;
      assert.equal(movement.productName, fields.name);
    }
    assert.equal(previous, await stock());
    await assert.rejects(inventory.list(buyer.id, { page: 1 }), error => error.code === 'FORBIDDEN');
    const sessions = new Sessions();
    const adminCookie = `cupcake_session=${sessions.create(adminUser.id)}`;
    const buyerCookie = `cupcake_session=${sessions.create(buyer.id)}`;
    const app = createApp({ dataSource: scoped, sessions, passwords: {} }, { logger: { error() {} } });
    const server = await new Promise(resolve => { const listening = app.listen(0, '127.0.0.1', () => resolve(listening)); });
    try {
      const url = `http://127.0.0.1:${server.address().port}/api/admin/stock-movements?productId=${product.id}`;
      assert.equal((await fetch(url)).status, 401);
      assert.equal((await fetch(url, { headers: { Cookie: buyerCookie } })).status, 403);
      const result = await fetch(url, { headers: { Cookie: adminCookie } });
      assert.equal(result.status, 200);
      assert.equal((await result.json()).movements.total, page1.total);
      assert.equal((await fetch(url + '&type=FORJADO', { headers: { Cookie: adminCookie } })).status, 400);
    } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    console.log('Sprint 7: abertura/inicialização, ajustes, vendas, devoluções, idempotência, rollback de auditoria, imutabilidade, filtros e autorização validados.');
  });
} catch (error) {
  console.error('Falha na verificação da Sprint 7:', error.code ?? error.name);
  if (error.name === 'AssertionError') console.error(error.message);
  process.exitCode = 1;
} finally {
  try {
    if (runner?.isTransactionActive) { await runner.rollbackTransaction(); console.log('ROLLBACK: nenhuma movimentação, conta, produto ou pedido fictício persistido.'); }
  } finally {
    if (runner) await runner.release();
    if (source.isInitialized) await source.destroy();
  }
}
