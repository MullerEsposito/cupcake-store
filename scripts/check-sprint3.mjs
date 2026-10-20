import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createDataSource } from '../src/infrastructure/typeorm/data-source.ts';
import { withDataSource } from '../src/infrastructure/typeorm/repository-context.ts';
import { AddressesRepository } from '../src/modules/addresses/repositories/implementations/typeorm/AddressesRepository.ts';
import { OrdersRepository } from '../src/modules/orders/repositories/implementations/typeorm/OrdersRepository.ts';
import { CartsRepository } from '#repositories/CartsRepository';
import { User } from '#entities/User';
import { Category } from '#entities/Category';
import { Product } from '#entities/Product';
import { Cart } from '#entities/Cart';
import { Address } from '#entities/Address';
import { Order } from '#entities/Order';
import { Payment } from '#entities/Payment';
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
  const category = await runner.manager.save(Category, { name: `Sprint 3 ${suffix}`, active: true });
  const users = [];
  for (const label of ['comprador', 'outro']) users.push(await runner.manager.save(User, {
    name: `Teste ${label}`, email: `${label}-${suffix}@example.test`, passwordHash: 'teste-revertido', role: 'CLIENTE', active: true
  }));
  const [buyer, other] = users;
  const product = await runner.manager.save(Product, { name: `Cupcake ${suffix}`, description: 'Teste revertido',
    categoryId: category.id, price: '0.10', weight: '10.000', image: '/cupcake.svg', stock: 10, active: true });
  const scoped = { isInitialized: true, getRepository: target => runner.manager.getRepository(target) };
  await withDataSource(scoped, async () => {
    const carts = new CartsRepository();
    const addresses = new AddressesRepository();
    const orders = new OrdersRepository();
    const input = { recipient: 'Comprador fictício', postalCode: '01001000', street: 'Rua Teste', number: '10',
      complement: null, district: 'Centro', city: 'São Paulo', state: 'SP' };
    const address = await addresses.create(buyer.id, input);
    const foreign = await addresses.create(other.id, input);
    assert.deepEqual((await addresses.list(buyer.id)).map(item => item.id), [address.id]);
    const owner = { kind: 'user', id: buyer.id };
    await carts.change(owner, { operation: 'add', productId: product.id, quantity: 3 });
    const checkout = { addressId: address.id, method: 'PIX', expectedSubtotal: '0.30', idempotencyKey: randomUUID() };
    await assert.rejects(orders.checkout(buyer.id, { ...checkout, addressId: foreign.id }), error => error.code === 'NOT_FOUND');
    await assert.rejects(orders.checkout(buyer.id, { ...checkout, expectedSubtotal: '0.01' }), error => error.code === 'CONFLICT');
    assert.equal((await carts.get(owner)).totalQuantity, 3);
    const order = await orders.checkout(buyer.id, checkout);
    assert.equal(order.status, 'AGUARDANDO_PAGAMENTO');
    assert.equal(order.total, '0.30');
    assert.equal(order.shipping, '0.00');
    assert.equal(order.payments[0].status, 'PENDENTE');
    assert.equal((await carts.get(owner)).totalQuantity, 0);
    assert.equal(await runner.manager.countBy(Cart, { userId: buyer.id, state: 'CONVERTIDO' }), 1);
    assert.equal((await runner.manager.findOneByOrFail(Product, { id: product.id })).stock, 10);
    assert.equal((await orders.checkout(buyer.id, checkout)).id, order.id);
    await assert.rejects(orders.pay(buyer.id, order.id, { method: 'PIX', outcome: 'APROVADO', idempotencyKey: randomUUID() }), error => error.code === 'CONFLICT');
    assert.equal(await runner.manager.countBy(Order, { userId: buyer.id }), 1);
    await assert.rejects(orders.checkout(other.id, checkout), error => error.code === 'CONFLICT');
    await assert.rejects(orders.pay(other.id, order.id, { method: 'PIX', outcome: 'APROVADO', idempotencyKey: checkout.idempotencyKey }), error => error.code === 'NOT_FOUND');
    await runner.manager.update(Product, { id: product.id }, { name: 'Nome alterado', price: '1.00' });
    await runner.manager.update(Address, { id: address.id }, { street: 'Rua alterada' });
    const refuse = { method: 'PIX', outcome: 'RECUSADO', idempotencyKey: checkout.idempotencyKey };
    const refused = await orders.pay(buyer.id, order.id, refuse);
    assert.equal(refused.payments[0].status, 'RECUSADO');
    assert.equal(refused.status, 'AGUARDANDO_PAGAMENTO');
    const repeatedRefusal = await orders.pay(buyer.id, order.id, { ...refuse, outcome: 'APROVADO' });
    assert.equal(repeatedRefusal.payments[0].status, 'RECUSADO');
    assert.equal(refused.items[0].unitPrice, '0.10');
    assert.equal(refused.items[0].name, product.name);
    assert.equal(refused.address.street, input.street);
    assert.equal((await runner.manager.findOneByOrFail(Product, { id: product.id })).stock, 10);
    const failed = await orders.pay(buyer.id, order.id, { method: 'BOLETO', outcome: 'FALHA', idempotencyKey: randomUUID() });
    assert.equal(failed.payments[0].status, 'FALHA');
    assert.equal((await runner.manager.findOneByOrFail(Product, { id: product.id })).stock, 10);
    const approval = { method: 'CARTAO', outcome: 'APROVADO', idempotencyKey: randomUUID() };
    const approved = await orders.pay(buyer.id, order.id, approval);
    assert.equal(approved.status, 'PAGAMENTO_APROVADO');
    assert.equal(approved.payments[0].amount, '0.30');
    assert.equal(approved.payments[0].simulated, true);
    assert.equal((await runner.manager.findOneByOrFail(Product, { id: product.id })).stock, 7);
    await orders.pay(buyer.id, order.id, approval);
    assert.equal((await runner.manager.findOneByOrFail(Product, { id: product.id })).stock, 7);
    assert.equal(await runner.manager.countBy(Payment, { orderId: order.id, status: 'APROVADO' }), 1);
    await assert.rejects(orders.pay(buyer.id, order.id, { ...approval, idempotencyKey: randomUUID() }), error => error.code === 'CONFLICT');
    assert.equal((await orders.list(other.id)).length, 0);

    await carts.change(owner, { operation: 'add', productId: product.id, quantity: 4 });
    const scarceInput = { ...checkout, expectedSubtotal: '4.00', idempotencyKey: randomUUID() };
    const scarce = await orders.checkout(buyer.id, scarceInput);
    await runner.manager.update(Product, { id: product.id }, { stock: 2 });
    const insufficient = await orders.pay(buyer.id, scarce.id, { method: 'PIX', outcome: 'APROVADO', idempotencyKey: scarceInput.idempotencyKey });
    assert.equal(insufficient.status, 'AGUARDANDO_PAGAMENTO');
    assert.equal(insufficient.payments[0].status, 'FALHA');
    assert.equal((await runner.manager.findOneByOrFail(Product, { id: product.id })).stock, 2);

    await runner.manager.update(Product, { id: product.id }, { stock: 10 });
    const injected = new Error('Falha controlada antes de gravar pagamento');
    const failingManager = new Proxy(runner.manager, { get(target, property) {
      if (property === 'transaction') return operation => target.transaction(manager => operation(new Proxy(manager, { get(inner, key) {
        if (key === 'update') return (entity, criteria, input) => {
          if (entity === Payment && input.status === 'APROVADO') throw injected;
          return inner.update(entity, criteria, input);
        };
        const value = Reflect.get(inner, key);
        return typeof value === 'function' ? value.bind(inner) : value;
      } })));
      const value = Reflect.get(target, property);
      return typeof value === 'function' ? value.bind(target) : value;
    } });
    const failingSource = { isInitialized: true, getRepository: () => ({ manager: failingManager }) };
    const brokenOrders = withDataSource(failingSource, () => new OrdersRepository());
    await assert.rejects(brokenOrders.pay(buyer.id, scarce.id, { method: 'PIX', outcome: 'APROVADO', idempotencyKey: randomUUID() }), error => error === injected);
    assert.equal((await runner.manager.findOneByOrFail(Product, { id: product.id })).stock, 10);
    assert.equal((await runner.manager.findOneByOrFail(Order, { id: scarce.id })).status, 'AGUARDANDO_PAGAMENTO');
    assert.equal(await runner.manager.countBy(Payment, { orderId: scarce.id, status: 'APROVADO' }), 0);

    const secondProduct = await runner.manager.save(Product, { name: `Segundo cupcake ${suffix}`, description: 'Teste revertido',
      categoryId: category.id, price: '0.20', weight: '10.000', image: '/cupcake.svg', stock: 3, active: true });
    await carts.change(owner, { operation: 'add', productId: product.id, quantity: 2 });
    await carts.change(owner, { operation: 'add', productId: secondProduct.id, quantity: 1 });
    const multipleInput = { ...checkout, expectedSubtotal: '2.20', idempotencyKey: randomUUID() };
    const multiple = await orders.checkout(buyer.id, multipleInput);
    await runner.manager.update(Product, { id: secondProduct.id }, { stock: 0 });
    const partial = await orders.pay(buyer.id, multiple.id, { method: 'PIX', outcome: 'APROVADO', idempotencyKey: multipleInput.idempotencyKey });
    assert.equal(partial.payments[0].status, 'FALHA');
    assert.equal((await runner.manager.findOneByOrFail(Product, { id: product.id })).stock, 10);
    assert.equal((await runner.manager.findOneByOrFail(Product, { id: secondProduct.id })).stock, 0);
    console.log('Pedido com dois produtos: estoque insuficiente no segundo não causa baixa parcial no primeiro.');

    await runner.manager.update(Product, { id: product.id }, { price: '9999999999.99' });
    await carts.change(owner, { operation: 'add', productId: product.id, quantity: 2 });
    await assert.rejects(orders.checkout(buyer.id, { ...checkout, expectedSubtotal: '0.00', idempotencyKey: randomUUID() }), error => error.code === 'CONFLICT');
    assert.equal((await carts.get(owner)).totalQuantity, 2);
    await carts.change(owner, { operation: 'remove', productId: product.id, quantity: 0 });
    await runner.manager.update(Product, { id: product.id }, { price: '1.00' });
    await runner.manager.update(User, { id: buyer.id }, { active: false });
    await assert.rejects(orders.list(buyer.id), error => error.code === 'UNAUTHORIZED');
    await runner.manager.update(User, { id: buyer.id }, { active: true });

    const sessions = new Sessions();
    const identity = `cupcake_session=${sessions.create(buyer.id)}`;
    const app = createApp({ dataSource: scoped, sessions, passwords: {} }, { logger: { error() {} } });
    const server = await new Promise(resolve => { const listening = app.listen(0, '127.0.0.1', () => resolve(listening)); });
    try {
      const url = `http://127.0.0.1:${server.address().port}`;
      const post = (path, body, cookie = identity) => fetch(url + path, { method: 'POST', headers: {
        Origin: 'http://localhost:3000', 'X-Cupcake-Request': '1', 'Content-Type': 'application/json', Cookie: cookie
      }, body: JSON.stringify(body) });
      assert.equal((await fetch(url + '/api/addresses', { headers: { Cookie: identity } })).status, 200);
      assert.equal((await fetch(url + '/api/orders', { headers: { Cookie: identity } })).status, 200);
      assert.equal((await post('/api/orders/checkout', checkout, '')).status, 401);
      assert.equal((await post('/api/orders/checkout', { ...checkout, total: '0.01' })).status, 400);
      const paymentResponse = await post(`/api/orders/${scarce.id}/payments`, { method: 'PIX', outcome: 'APROVADO', idempotencyKey: randomUUID() });
      assert.equal(paymentResponse.status, 200);
      assert.equal((await paymentResponse.json()).order.status, 'PAGAMENTO_APROVADO');
      const otherIdentity = `cupcake_session=${sessions.create(other.id)}`;
      assert.equal((await post(`/api/orders/${scarce.id}/payments`, approval, otherIdentity)).status, 404);
    } finally {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
    console.log('Sprint 3: endereços, isolamento, checkout, snapshots, pagamento simulado, idempotência, estoque e rollback integral validados em PostgreSQL.');
  });
} catch (error) {
  console.error('Falha na verificação da Sprint 3:', error.code ?? error.name);
  if (error.name === 'AssertionError') console.error(error.message);
  process.exitCode = 1;
} finally {
  try {
    if (runner?.isTransactionActive) { await runner.rollbackTransaction(); console.log('ROLLBACK executado: dados de teste não persistidos.'); }
  } finally {
    if (runner) await runner.release();
    if (source.isInitialized) await source.destroy();
  }
}
