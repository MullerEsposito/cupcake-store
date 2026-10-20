import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAddress } from '../src/modules/addresses/validators/validateAddress.ts';
import { validateCheckout, validatePayment, validateOrderId } from '../src/modules/orders/validators/validateCheckout.ts';
import { CheckoutService } from '../src/modules/orders/useCases/checkout/CheckoutService.ts';
import { PayOrderService } from '../src/modules/orders/useCases/payOrder/PayOrderService.ts';
import { ListOrdersService } from '../src/modules/orders/useCases/listOrders/ListOrdersService.ts';
import { CreateAddressService } from '../src/modules/addresses/useCases/createAddress/CreateAddressService.ts';
import { createStorefrontApi } from '../client/src/infrastructure/storefront-api.ts';
import { createDataSource } from '../src/infrastructure/typeorm/data-source.ts';
import { Address } from '#entities/Address';
import { Order } from '#entities/Order';
import { OrderItem } from '#entities/OrderItem';
import { Payment } from '#entities/Payment';
import { createApp } from '../src/adapters/http/server.ts';
import { Sessions } from '#infrastructure/security/primitives';

const address = { recipient: ' Cliente ', postalCode: '12345-678', street: 'Rua Teste', number: '10',
  district: 'Centro', city: 'São Paulo', state: 'sp' };
const checkout = { addressId: '1', method: 'PIX', idempotencyKey: 'checkout-test-key-123', expectedSubtotal: '12.90' };
const validation = error => error.code === 'VALIDATION';

test('endereço normaliza CEP e UF sem aceitar dono forjado ou campos excedentes', () => {
  assert.deepEqual(validateAddress(address), { ...address, recipient: 'Cliente', postalCode: '12345678', state: 'SP', complement: null });
  for (const input of [null, [], { ...address, userId: '2' }, { ...address, postalCode: '12' },
    { ...address, state: 'XX' }, { ...address, number: '' }, { ...address, street: 'x'.repeat(201) },
    { ...address, recipient: '\u0000' }, { ...address, complement: 23 }]) {
    assert.throws(() => validateAddress(input), validation);
  }
});

test('checkout valida identidade, método e subtotal confirmado sem aceitar totais enviados pelo cliente', () => {
  assert.deepEqual(validateCheckout(checkout), checkout);
  for (const input of [{ ...checkout, total: '0.01' }, { ...checkout, addressId: '1 OR 1=1' },
    { ...checkout, expectedSubtotal: 12.9 }, { ...checkout, expectedSubtotal: '-1.00' },
    { ...checkout, expectedSubtotal: '10000000000.00' }, { ...checkout, method: 'DINHEIRO' },
    { ...checkout, idempotencyKey: '' }, { ...checkout, idempotencyKey: 'x'.repeat(129) }]) {
    assert.throws(() => validateCheckout(input), validation);
  }
});

test('simulação aceita somente resultados e métodos previstos sem coletar dados reais de cartão', () => {
  for (const method of ['PIX', 'CARTAO', 'BOLETO']) {
    for (const outcome of ['APROVADO', 'RECUSADO', 'FALHA']) {
      assert.deepEqual(validatePayment({ method, outcome, idempotencyKey: checkout.idempotencyKey }),
        { method, outcome, idempotencyKey: checkout.idempotencyKey });
    }
  }
  assert.throws(() => validatePayment({ method: 'PIX', outcome: 'PAGO', idempotencyKey: checkout.idempotencyKey }), validation);
  assert.throws(() => validatePayment({ method: 'CARTAO', outcome: 'APROVADO', idempotencyKey: checkout.idempotencyKey, cardNumber: '123' }), validation);
  for (const invalid of ['0', '-1', [], undefined, '1/2', '9'.repeat(19)]) assert.throws(() => validateOrderId(invalid), validation);
});

test('serviços de checkout e pagamento exigem usuário ativo antes de acessar pedidos', async () => {
  let accessed = false;
  const repository = { checkout() { accessed = true; }, pay() { accessed = true; }, list() { accessed = true; } };
  const users = { findActiveById: async () => null };
  await assert.rejects(new CheckoutService(repository, users).execute(null, checkout), error => error.code === 'UNAUTHORIZED');
  await assert.rejects(new CheckoutService(repository, users).execute('1', checkout), error => error.code === 'UNAUTHORIZED');
  await assert.rejects(new PayOrderService(repository, users).execute('1', '1', {}), error => error.code === 'UNAUTHORIZED');
  await assert.rejects(new ListOrdersService(repository, users).execute('1'), error => error.code === 'UNAUTHORIZED');
  assert.equal(accessed, false);
});

test('serviços encaminham somente identidade autenticada e dados validados aos contratos', async () => {
  const calls = [];
  const users = { findActiveById: async id => ({ id }) };
  const repository = { checkout: async (...args) => { calls.push(args); return { id: 'pedido' }; } };
  assert.deepEqual(await new CheckoutService(repository, users).execute('7', checkout), { id: 'pedido' });
  assert.deepEqual(calls, [['7', checkout]]);
  const addresses = { create: async (...args) => args };
  assert.deepEqual(await new CreateAddressService(addresses, users, { lookup: async () => ({ city: 'São Paulo', state: 'SP' }) }).execute('7', address), ['7', validateAddress(address)]);
});

test('novas entidades preservam tabelas e precisão monetária do modelo físico existente', async () => {
  const source = createDataSource();
  await source.buildMetadatas();
  for (const [entity, table] of [[Address, 'endereco'], [Order, 'pedido'], [OrderItem, 'item_pedido'], [Payment, 'pagamento']]) {
    const metadata = source.getMetadata(entity);
    assert.equal(metadata.tablePath, `public.${table}`);
    assert.equal(metadata.findColumnWithPropertyName('id').generatedIdentity, 'ALWAYS');
  }
  assert.equal(source.getMetadata(Order).findColumnWithPropertyName('total').precision, 12);
  assert.equal(source.getMetadata(Order).findColumnWithPropertyName('total').scale, 2);
  assert.equal(source.getMetadata(Payment).findColumnWithPropertyName('simulated').default, true);
  assert.equal(source.getMetadata(Address).findColumnWithPropertyName('userId').databaseName, 'usuario_id');
  const [sql, parameters] = source.createQueryBuilder().update(Payment)
    .set({ status: 'APROVADO', processedAt: () => 'GREATEST(clock_timestamp(), criado_em)' })
    .where('id = :id', { id: '1' }).getQueryAndParameters();
  assert.match(sql, /GREATEST\(clock_timestamp\(\), "criado_em"\)/);
  assert.deepEqual(parameters, ['APROVADO', '1']);
});

test('cliente Axios usa endpoints de endereços e pedidos sem aceitar usuário no URL', async () => {
  const calls = [];
  const client = {
    get: async (...args) => { calls.push(['GET', ...args]); return { data: { addresses: [], orders: [] } }; },
    post: async (...args) => { calls.push(['POST', ...args]); return { data: { address: { id: '1' }, order: { id: '2' } } }; }
  };
  const api = createStorefrontApi(client);
  assert.deepEqual(await api.addresses(), []);
  assert.deepEqual(await api.orders(), []);
  await api.createAddress(address);
  await api.checkout(checkout);
  await api.payOrder('2', { method: 'PIX', outcome: 'APROVADO', idempotencyKey: checkout.idempotencyKey });
  assert.deepEqual(calls.map(call => call.slice(0, 2)), [['GET', '/addresses'], ['GET', '/orders'],
    ['POST', '/addresses'], ['POST', '/orders/checkout'], ['POST', '/orders/2/payments']]);
});

test('rotas de endereços e pedidos bloqueiam visitantes antes de compor repositórios', async () => {
  const app = createApp({ dataSource: {}, sessions: new Sessions(), passwords: {} });
  const server = await new Promise(resolve => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ['/api/addresses', '/api/orders']) assert.equal((await fetch(url + path)).status, 401);
    for (const path of ['/api/addresses', '/api/orders/checkout', '/api/orders/1/payments']) {
      assert.equal((await fetch(url + path, { method: 'POST', headers: { Origin: 'http://localhost:3000',
        'X-Cupcake-Request': '1', 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
      assert.equal((await fetch(url + path, { method: 'POST', body: '{}' })).status, 403);
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
