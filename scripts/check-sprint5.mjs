import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createDataSource } from '../src/infrastructure/typeorm/data-source.ts';
import { withDataSource } from '../src/infrastructure/typeorm/repository-context.ts';
import { OrdersRepository } from '../src/modules/orders/repositories/implementations/typeorm/OrdersRepository.ts';
import { AddressesRepository } from '../src/modules/addresses/repositories/implementations/typeorm/AddressesRepository.ts';
import { AdministrationRepository } from '../src/modules/admin/repositories/implementations/typeorm/AdministrationRepository.ts';
import { CartsRepository } from '#repositories/CartsRepository';
import { User } from '#entities/User';
import { Category } from '#entities/Category';
import { Product } from '#entities/Product';
import { Order } from '#entities/Order';
import { Payment } from '#entities/Payment';
import { OrderCancellation } from '#entities/OrderCancellation';
import { cents, money } from '../src/modules/cart/entities/cart-summary.ts';
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
  for (const role of ['CLIENTE', 'CLIENTE', 'ADMIN']) users.push(await runner.manager.save(User, {
    name: `Teste Sprint 5 ${users.length}`, email: `${users.length}-${suffix}@example.test`, passwordHash: 'teste-revertido', role, active: true
  }));
  const [buyer, other, administrator] = users;
  const category = await runner.manager.save(Category, { name: `Sprint 5 ${suffix}`, active: true });
  const product = await runner.manager.save(Product, { name: `Cupcake ${suffix}`, description: 'Teste revertido', categoryId: category.id,
    price: '0.10', weight: '85.000', image: '/cupcake.svg', active: true, stock: 100 });
  const scoped = { isInitialized: true, getRepository: target => runner.manager.getRepository(target) };
  await withDataSource(scoped, async () => {
    const orders = new OrdersRepository();
    const carts = new CartsRepository();
    const addresses = new AddressesRepository();
    const admin = new AdministrationRepository();
    const address = await addresses.create(buyer.id, { recipient: 'Comprador fictício', postalCode: '01001000', street: 'Rua Teste',
      number: '10', complement: null, district: 'Centro', city: 'São Paulo', state: 'SP' });
    const owner = { kind: 'user', id: buyer.id };
    const stock = async (id = product.id) => (await runner.manager.findOneByOrFail(Product, { id })).stock;
    const cancellationInput = (status = 'AGUARDANDO_PAGAMENTO') => ({ reason: 'Cancelamento de teste revertido', expectedStatus: status, idempotencyKey: randomUUID() });
    async function makeOrder(paid = false, quantity = 2, selected = product) {
      await carts.change(owner, { operation: 'add', productId: selected.id, quantity });
      const checkout = { addressId: address.id, method: 'PIX', expectedSubtotal: money(cents(selected.price) * BigInt(quantity)), idempotencyKey: randomUUID() };
      const order = await orders.checkout(buyer.id, checkout);
      if (!paid) return { order, checkout };
      return { order: await orders.pay(buyer.id, order.id, { method: 'PIX', outcome: 'APROVADO', idempotencyKey: checkout.idempotencyKey }), checkout };
    }

    const unpaid = await makeOrder();
    const unpaidInput = cancellationInput();
    const canceledUnpaid = await orders.cancel(buyer.id, unpaid.order.id, unpaidInput);
    assert.equal(canceledUnpaid.status, 'CANCELADO');
    assert.equal(canceledUnpaid.cancellation.refundStatus, 'NAO_APLICAVEL');
    assert.equal(canceledUnpaid.cancellation.refundAmount, '0.00');
    assert.equal(canceledUnpaid.cancellation.stockRestored, false);
    assert.equal(canceledUnpaid.payments[0].status, 'FALHA');
    assert.equal(await stock(), 100);
    assert.equal((await orders.cancel(buyer.id, unpaid.order.id, unpaidInput)).cancellation.id, canceledUnpaid.cancellation.id);
    assert.equal(await runner.manager.countBy(OrderCancellation, { orderId: unpaid.order.id }), 1);
    await assert.rejects(orders.cancel(buyer.id, unpaid.order.id, cancellationInput()), error => error.code === 'CONFLICT');
    await assert.rejects(orders.cancel(buyer.id, unpaid.order.id, { ...unpaidInput, reason: 'Outro motivo' }), error => error.code === 'CONFLICT');
    await assert.rejects(orders.pay(buyer.id, unpaid.order.id, { method: 'PIX', outcome: 'APROVADO', idempotencyKey: randomUUID() }), error => error.code === 'CONFLICT');
    assert.equal((await orders.checkout(buyer.id, unpaid.checkout)).status, 'CANCELADO');

    const paid = await makeOrder(true, 3);
    assert.equal(await stock(), 97);
    await assert.rejects(orders.cancel(buyer.id, paid.order.id, cancellationInput()), error => error.code === 'CONFLICT');
    assert.equal(await runner.manager.countBy(OrderCancellation, { orderId: paid.order.id }), 0);
    await runner.manager.update(Product, { id: product.id }, { active: false });
    const paidInput = cancellationInput('PAGAMENTO_APROVADO');
    const canceledPaid = await orders.cancel(buyer.id, paid.order.id, paidInput);
    assert.equal(canceledPaid.cancellation.refundStatus, 'SIMULADO');
    assert.equal(canceledPaid.cancellation.refundAmount, '0.30');
    assert.equal(canceledPaid.cancellation.stockRestored, true);
    assert.equal(canceledPaid.cancellation.paymentId, paid.order.payments[0].id);
    assert.equal(canceledPaid.cancellation.actorId, buyer.id);
    assert.equal(canceledPaid.cancellation.actorRole, 'CLIENTE');
    assert.equal(canceledPaid.payments[0].status, 'APROVADO');
    assert.equal(await stock(), 100);
    assert.equal((await runner.manager.findOneByOrFail(Product, { id: product.id })).active, false);
    await orders.cancel(buyer.id, paid.order.id, paidInput);
    await orders.pay(buyer.id, paid.order.id, { method: 'PIX', outcome: 'APROVADO', idempotencyKey: paid.checkout.idempotencyKey });
    assert.equal(await stock(), 100);
    assert.equal(await runner.manager.countBy(OrderCancellation, { paymentId: paid.order.payments[0].id }), 1);
    await runner.manager.update(Product, { id: product.id }, { active: true });

    const refused = await makeOrder();
    await orders.pay(buyer.id, refused.order.id, { method: 'PIX', outcome: 'RECUSADO', idempotencyKey: refused.checkout.idempotencyKey });
    assert.equal((await orders.cancel(buyer.id, refused.order.id, cancellationInput())).cancellation.refundAmount, '0.00');
    assert.equal(await stock(), 100);
    const preparing = await makeOrder(true, 1);
    await admin.advanceOrder(administrator.id, preparing.order.id, { expectedStatus: 'PAGAMENTO_APROVADO', status: 'EM_PREPARACAO' });
    await assert.rejects(orders.cancel(buyer.id, preparing.order.id, cancellationInput('PAGAMENTO_APROVADO')), error => error.code === 'CONFLICT');
    const byAdmin = await orders.cancelAsAdministrator(administrator.id, preparing.order.id, cancellationInput('EM_PREPARACAO'));
    assert.equal(byAdmin.cancellation.actorId, administrator.id);
    assert.equal(byAdmin.cancellation.actorRole, 'ADMIN');
    assert.equal(await stock(), 100);
    await assert.rejects(admin.advanceOrder(administrator.id, preparing.order.id, { expectedStatus: 'EM_PREPARACAO', status: 'SAIU_PARA_ENTREGA' }), error => error.code === 'CONFLICT');

    const shipping = await makeOrder(true, 1);
    await admin.advanceOrder(administrator.id, shipping.order.id, { expectedStatus: 'PAGAMENTO_APROVADO', status: 'EM_PREPARACAO' });
    await admin.advanceOrder(administrator.id, shipping.order.id, { expectedStatus: 'EM_PREPARACAO', status: 'SAIU_PARA_ENTREGA' });
    await assert.rejects(orders.cancel(buyer.id, shipping.order.id, cancellationInput('EM_PREPARACAO')), error => error.code === 'CONFLICT');
    await assert.rejects(orders.cancelAsAdministrator(administrator.id, shipping.order.id, cancellationInput('EM_PREPARACAO')), error => error.code === 'CONFLICT');
    await admin.advanceOrder(administrator.id, shipping.order.id, { expectedStatus: 'SAIU_PARA_ENTREGA', status: 'ENTREGUE' });
    await assert.rejects(orders.cancel(buyer.id, shipping.order.id, cancellationInput('EM_PREPARACAO')), error => error.code === 'CONFLICT');
    assert.equal(await runner.manager.countBy(OrderCancellation, { orderId: shipping.order.id }), 0);
    assert.equal(await stock(), 99);

    const foreign = await makeOrder();
    await assert.rejects(orders.cancel(other.id, foreign.order.id, cancellationInput()), error => error.code === 'NOT_FOUND');
    await assert.rejects(orders.cancelAsAdministrator(other.id, foreign.order.id, cancellationInput()), error => error.code === 'FORBIDDEN');
    await assert.rejects(orders.cancel(buyer.id, foreign.order.id, unpaidInput), error => error.code === 'CONFLICT');
    await runner.manager.update(User, { id: buyer.id }, { active: false });
    await assert.rejects(orders.cancel(buyer.id, foreign.order.id, cancellationInput()), error => error.code === 'UNAUTHORIZED');
    await runner.manager.update(User, { id: buyer.id }, { active: true });

    const freeProduct = await runner.manager.save(Product, { ...product, id: undefined, name: `Gratuito ${suffix}`, price: '0.00', stock: 3 });
    const free = await makeOrder(true, 1, freeProduct);
    const refundedFree = await orders.cancel(buyer.id, free.order.id, cancellationInput('PAGAMENTO_APROVADO'));
    assert.equal(refundedFree.cancellation.refundAmount, '0.00');
    assert.equal(refundedFree.cancellation.refundStatus, 'SIMULADO');
    assert.ok(refundedFree.cancellation.paymentId);
    assert.equal(await stock(freeProduct.id), 3);

    const failureCase = await makeOrder(true, 2);
    const beforeFailure = await stock();
    const injected = new Error('Falha controlada ao concluir cancelamento');
    const brokenManager = new Proxy(runner.manager, { get(target, property) {
      if (property === 'transaction') return operation => target.transaction(manager => operation(new Proxy(manager, { get(inner, key) {
        if (key === 'save') return (entity, value) => {
          if (entity === Order && value.status === 'CANCELADO') throw injected;
          return inner.save(entity, value);
        };
        const value = Reflect.get(inner, key);
        return typeof value === 'function' ? value.bind(inner) : value;
      } })));
      const value = Reflect.get(target, property);
      return typeof value === 'function' ? value.bind(target) : value;
    } });
    const brokenSource = { isInitialized: true, getRepository: () => ({ manager: brokenManager }) };
    const broken = withDataSource(brokenSource, () => new OrdersRepository());
    await assert.rejects(broken.cancel(buyer.id, failureCase.order.id, cancellationInput('PAGAMENTO_APROVADO')), error => error === injected);
    assert.equal(await stock(), beforeFailure);
    assert.equal((await orders.find(buyer.id, failureCase.order.id)).status, 'PAGAMENTO_APROVADO');
    assert.equal(await runner.manager.countBy(OrderCancellation, { orderId: failureCase.order.id }), 0);
    await assert.rejects(broken.cancel(buyer.id, foreign.order.id, cancellationInput()), error => error === injected);
    assert.equal((await orders.find(buyer.id, foreign.order.id)).payments[0].status, 'PENDENTE');
    await runner.manager.update(Product, { id: product.id }, { stock: 2147483647 });
    await assert.rejects(orders.cancel(buyer.id, failureCase.order.id, cancellationInput('PAGAMENTO_APROVADO')), error => error.code === 'CONFLICT');
    assert.equal(await stock(), 2147483647);
    assert.equal(await runner.manager.countBy(OrderCancellation, { orderId: failureCase.order.id }), 0);
    await runner.manager.update(Product, { id: product.id }, { stock: beforeFailure });

    const secondProduct = await runner.manager.save(Product, { ...product, id: undefined, name: `Segundo produto ${suffix}`, price: '0.20', stock: 10 });
    await carts.change(owner, { operation: 'add', productId: product.id, quantity: 1 });
    await carts.change(owner, { operation: 'add', productId: secondProduct.id, quantity: 2 });
    const multiKey = randomUUID();
    const multiple = await orders.checkout(buyer.id, { addressId: address.id, method: 'PIX', expectedSubtotal: '0.50', idempotencyKey: multiKey });
    await orders.pay(buyer.id, multiple.id, { method: 'PIX', outcome: 'APROVADO', idempotencyKey: multiKey });
    const firstBefore = await stock();
    await runner.manager.update(Product, { id: secondProduct.id }, { stock: 2147483647 });
    await assert.rejects(orders.cancel(buyer.id, multiple.id, cancellationInput('PAGAMENTO_APROVADO')), error => error.code === 'CONFLICT');
    assert.equal(await stock(), firstBefore);
    assert.equal(await runner.manager.countBy(OrderCancellation, { orderId: multiple.id }), 0);
    await runner.manager.update(Product, { id: secondProduct.id }, { stock: 8 });
    const multiCancellation = cancellationInput('PAGAMENTO_APROVADO');
    await orders.cancel(buyer.id, multiple.id, multiCancellation);
    await orders.cancel(buyer.id, multiple.id, multiCancellation);
    assert.equal(await stock(), firstBefore + 1);
    assert.equal(await stock(secondProduct.id), 10);
    assert.equal(await runner.manager.countBy(OrderCancellation, { orderId: multiple.id }), 1);

    await assert.rejects(runner.manager.transaction(manager => manager.update(OrderCancellation, { id: canceledPaid.cancellation.id }, { simulated: false })), error => error.code === '23514');
    await assert.rejects(runner.manager.transaction(manager => manager.update(OrderCancellation, { id: canceledPaid.cancellation.id }, { orderId: unpaid.order.id })), error => error.code === '23505');
    assert.equal((await orders.find(buyer.id, paid.order.id)).cancellation.simulated, true);

    const sessions = new Sessions();
    const buyerCookie = `cupcake_session=${sessions.create(buyer.id)}`;
    const otherCookie = `cupcake_session=${sessions.create(other.id)}`;
    const adminCookie = `cupcake_session=${sessions.create(administrator.id)}`;
    const app = createApp({ dataSource: scoped, sessions, passwords: {} }, { logger: { error() {} } });
    const server = await new Promise(resolve => { const listening = app.listen(0, '127.0.0.1', () => resolve(listening)); });
    try {
      const url = `http://127.0.0.1:${server.address().port}`;
      const post = (path, body, cookie = buyerCookie) => fetch(url + path, { method: 'POST', headers: {
        Origin: 'http://localhost:3000', 'X-Cupcake-Request': '1', 'Content-Type': 'application/json', Cookie: cookie
      }, body: JSON.stringify(body) });
      const endpoint = `/api/orders/${foreign.order.id}/cancel`;
      const httpInput = cancellationInput();
      assert.equal((await post(endpoint, httpInput, '')).status, 401);
      assert.equal((await post(endpoint, httpInput, otherCookie)).status, 404);
      assert.equal((await post(endpoint, { ...httpInput, refundAmount: '100.00' })).status, 400);
      const response = await post(endpoint, httpInput);
      assert.equal(response.status, 200);
      assert.equal((await response.json()).order.cancellation.refundStatus, 'NAO_APLICAVEL');
      assert.equal((await post(endpoint, httpInput)).status, 200);
      const adminEndpoint = `/api/admin/orders/${failureCase.order.id}/cancel`;
      const refundInput = cancellationInput('PAGAMENTO_APROVADO');
      assert.equal((await post(adminEndpoint, refundInput, buyerCookie)).status, 403);
      const refunded = await post(adminEndpoint, refundInput, adminCookie);
      assert.equal(refunded.status, 200);
      const output = (await refunded.json()).order;
      assert.equal(output.cancellation.refundAmount, failureCase.order.total);
      assert.equal(output.cancellation.actorId, administrator.id);
      const after = await stock();
      assert.equal((await post(adminEndpoint, refundInput, adminCookie)).status, 200);
      assert.equal(await stock(), after);
      await runner.manager.update(User, { id: administrator.id }, { role: 'CLIENTE' });
      assert.equal((await post(adminEndpoint, refundInput, adminCookie)).status, 403);
    } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    console.log('Sprint 5: cancelamento pago/não pago, estorno simulado, estoque único, auditoria, autorização e rollback integral validados.');
  });
} catch (error) {
  console.error('Falha na verificação da Sprint 5:', error.code ?? error.name);
  if (error.name === 'AssertionError') console.error(error.message);
  process.exitCode = 1;
} finally {
  try {
    if (runner?.isTransactionActive) { await runner.rollbackTransaction(); console.log('ROLLBACK executado: cancelamentos, estornos e demais dados fictícios não persistidos.'); }
  } finally {
    if (runner) await runner.release();
    if (source.isInitialized) await source.destroy();
  }
}
