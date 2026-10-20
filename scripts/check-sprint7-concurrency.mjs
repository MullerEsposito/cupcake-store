import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { DataSource } from 'typeorm';
import { createDataSource } from '../src/infrastructure/typeorm/data-source.ts';
import { withDataSource } from '../src/infrastructure/typeorm/repository-context.ts';
import { AdministrationRepository } from '../src/modules/admin/repositories/implementations/typeorm/AdministrationRepository.ts';
import { OrdersRepository } from '../src/modules/orders/repositories/implementations/typeorm/OrdersRepository.ts';
import { AddressesRepository } from '../src/modules/addresses/repositories/implementations/typeorm/AddressesRepository.ts';
import { CartsRepository } from '#repositories/CartsRepository';
import { User } from '#entities/User';
import { Product } from '#entities/Product';
import { StockMovement } from '#entities/StockMovement';

const databaseName = `cupcake_s7_test_${randomUUID().replaceAll('-', '')}`;
const marker = `cupcake-store-sprint7-disposable:${databaseName}`;
if (!/^cupcake_s7_test_[a-f0-9]{32}$/.test(databaseName)) throw new Error('Nome do banco temporário inválido.');
const options = createDataSource().options;
const control = new DataSource({ ...options, database: 'postgres', entities: [], migrations: [], applicationName: 'cupcake_s7_test_control' });
const source = new DataSource({ ...options, database: databaseName, applicationName: 'cupcake_s7_concurrency' });
let created = false;
try {
  await control.initialize();
  await control.query(`CREATE DATABASE "${databaseName}" TEMPLATE template0 ENCODING 'UTF8'`);
  created = true;
  await control.query(`COMMENT ON DATABASE "${databaseName}" IS '${marker}'`);
  await source.initialize();
  const original = await readFile(new URL('../database/pitii-modelo-fisico.sql', import.meta.url), 'utf8');
  const guard = "current_database() <> 'cupcake_store'";
  assert.equal(original.split(guard).length, 2);
  await source.query(original.replace(guard, `current_database() <> '${databaseName}'`));
  await source.runMigrations({ transaction: 'all' });
  await withDataSource(source, async () => {
    const admin = new AdministrationRepository();
    const orders = new OrdersRepository();
    const carts = new CartsRepository();
    const addresses = new AddressesRepository();
    const administrator = await source.manager.save(User, { name: 'Admin isolado', email: 'admin@example.test', passwordHash: 'teste', role: 'ADMIN', active: true });
    const buyers = [];
    const buyerAddresses = [];
    for (let index = 0; index < 2; index++) {
      const buyer = await source.manager.save(User, { name: `Cliente isolado ${index}`, email: `cliente${index}@example.test`, passwordHash: 'teste', role: 'CLIENTE', active: true });
      buyers.push(buyer);
      buyerAddresses.push(await addresses.create(buyer.id, { recipient: buyer.name, postalCode: '01001000', street: 'Rua Teste', number: '1', complement: null, district: 'Centro', city: 'São Paulo', state: 'SP' }));
    }
    const category = await admin.saveCategory(administrator.id, undefined, { name: 'Categoria isolada', description: null, active: true });
    const product = (name, initialStock) => admin.saveProduct(administrator.id, undefined, { name, initialStock, categoryId: category.id, description: 'Teste isolado', price: '1.00', weight: '1.000', image: '/cupcake.svg', active: true });
    async function checkout(selected, quantity = 1, buyerIndex = 0) {
      await carts.change({ kind: 'user', id: buyers[buyerIndex].id }, { operation: 'add', productId: selected.id, quantity });
      const key = randomUUID();
      const order = await orders.checkout(buyers[buyerIndex].id, { addressId: buyerAddresses[buyerIndex].id, expectedSubtotal: `${quantity}.00`, method: 'PIX', idempotencyKey: key });
      return { buyerId: buyers[buyerIndex].id, orderId: order.id, input: { method: 'PIX', outcome: 'APROVADO', idempotencyKey: key } };
    }
    const pay = pending => orders.pay(pending.buyerId, pending.orderId, pending.input);
    const cancelInput = (expectedStatus = 'PAGAMENTO_APROVADO') => ({ expectedStatus, reason: 'Cancelamento de teste isolado', idempotencyKey: randomUUID() });
    const adjust = (selected, expectedStock, delta) => admin.adjustStock(administrator.id, selected.id, { expectedStock, delta, reason: 'Ajuste de concorrência isolado' });
    async function verify(selected) {
      const chain = await source.manager.find(StockMovement, { where: { productId: selected.id }, order: { id: 'ASC' } });
      let stock = 0;
      for (const movement of chain) {
        assert.equal(movement.previousStock, stock);
        assert.equal(movement.currentStock, stock + movement.quantity);
        stock = movement.currentStock;
      }
      assert.equal(stock, (await source.manager.findOneByOrFail(Product, { id: selected.id })).stock);
      assert.ok(stock >= 0);
      return { stock, chain };
    }

    const duplicate = await product('Pagamento e cancelamento repetidos', 2);
    const pending = await checkout(duplicate, 2);
    const paid = await Promise.all([pay(pending), pay(pending)]);
    assert.ok(paid.every(order => order.status === 'PAGAMENTO_APROVADO'));
    assert.equal((await verify(duplicate)).stock, 0);
    assert.equal(await source.manager.countBy(StockMovement, { productId: duplicate.id, type: 'VENDA' }), 1);
    const sameCancel = cancelInput();
    await Promise.all([orders.cancel(pending.buyerId, pending.orderId, sameCancel), orders.cancel(pending.buyerId, pending.orderId, sameCancel)]);
    assert.equal((await verify(duplicate)).stock, 2);
    assert.equal(await source.manager.countBy(StockMovement, { productId: duplicate.id, type: 'DEVOLUCAO' }), 1);

    const scarce = await product('Última unidade', 1);
    const first = await checkout(scarce, 1, 0);
    const second = await checkout(scarce, 1, 1);
    const competition = await Promise.all([pay(first), pay(second)]);
    assert.equal(competition.filter(order => order.status === 'PAGAMENTO_APROVADO').length, 1);
    assert.equal(competition.filter(order => order.status === 'AGUARDANDO_PAGAMENTO').length, 1);
    assert.equal((await verify(scarce)).stock, 0);
    assert.equal(await source.manager.countBy(StockMovement, { productId: scarce.id, type: 'VENDA' }), 1);

    const manual = await product('Ajustes simultâneos', 0);
    const adjustments = await Promise.allSettled([adjust(manual, 0, 1), adjust(manual, 0, 2)]);
    assert.equal(adjustments.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(adjustments.find(result => result.status === 'rejected').reason.code, 'CONFLICT');
    assert.equal((await verify(manual)).chain.length, 2);

    const refundRace = await product('Estorno e ajuste simultâneos', 2);
    const refundOrder = await checkout(refundRace);
    await pay(refundOrder);
    const refundResults = await Promise.allSettled([
      orders.cancel(refundOrder.buyerId, refundOrder.orderId, cancelInput()), adjust(refundRace, 1, 3)
    ]);
    assert.equal(refundResults[0].status, 'fulfilled');
    if (refundResults[1].status === 'rejected') assert.equal(refundResults[1].reason.code, 'CONFLICT');
    assert.equal((await verify(refundRace)).stock, refundResults[1].status === 'fulfilled' ? 5 : 2);
    assert.equal(await source.manager.countBy(StockMovement, { productId: refundRace.id, type: 'DEVOLUCAO' }), 1);

    const saleRace = await product('Venda e ajuste simultâneos', 2);
    const saleOrder = await checkout(saleRace);
    const saleResults = await Promise.allSettled([pay(saleOrder), adjust(saleRace, 2, 1)]);
    assert.equal(saleResults[0].status, 'fulfilled');
    if (saleResults[1].status === 'rejected') assert.equal(saleResults[1].reason.code, 'CONFLICT');
    assert.equal((await verify(saleRace)).stock, saleResults[1].status === 'fulfilled' ? 2 : 1);

    const stateRace = await product('Pagamento e cancelamento simultâneos', 2);
    const stateOrder = await checkout(stateRace);
    const stateResults = await Promise.allSettled([
      pay(stateOrder), orders.cancel(stateOrder.buyerId, stateOrder.orderId, cancelInput('AGUARDANDO_PAGAMENTO'))
    ]);
    assert.equal(stateResults.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(stateResults.find(result => result.status === 'rejected').reason.code, 'CONFLICT');
    const final = await orders.find(stateOrder.buyerId, stateOrder.orderId);
    assert.equal((await verify(stateRace)).stock, final.status === 'CANCELADO' ? 2 : 1);
    console.log('Sprint 7: concorrência PostgreSQL validada em banco temporário isolado, sem acessar dados da aplicação.');
  });
} catch (error) {
  console.error('Falha no diagnóstico isolado da Sprint 7:', error.code ?? error.name);
  if (error.name === 'AssertionError') console.error(error.message);
  process.exitCode = 1;
} finally {
  try {
    if (source.isInitialized) await source.destroy();
    if (created) {
      const [database] = await control.query('SELECT shobj_description(oid, \'pg_database\') AS marker FROM pg_database WHERE datname = $1', [databaseName]);
      if (database?.marker !== marker || !/^cupcake_s7_test_[a-f0-9]{32}$/.test(databaseName)) throw new Error('Identificação do banco temporário divergente; limpeza bloqueada.');
      await control.query(`DROP DATABASE "${databaseName}"`);
      console.log('Banco temporário de concorrência removido.');
    }
  } catch (error) {
    console.error('Limpeza do banco temporário não concluída:', databaseName, error.code ?? error.name);
    process.exitCode = 1;
  } finally { if (control.isInitialized) await control.destroy(); }
}
