import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { validateInventoryFilter } from '../src/modules/inventory/validators/validateInventoryFilter.ts';
import { validateStockAdjustment } from '../src/modules/admin/validators/admin-input.ts';
import { ListStockMovementsService } from '../src/modules/inventory/useCases/listStockMovements/ListStockMovementsService.ts';
import { InventoryRepository } from '../src/modules/inventory/repositories/implementations/typeorm/InventoryRepository.ts';
import { StockMovement } from '../src/modules/inventory/entities/StockMovement.ts';
import { changeStock, recordInitialStock } from '../src/modules/inventory/repositories/implementations/typeorm/stock-ledger.ts';
import { CreateStockMovements1792537200000 } from '../src/infrastructure/typeorm/migrations/1792537200000-CreateStockMovements.ts';
import { createDataSource } from '../src/infrastructure/typeorm/data-source.ts';
import { withDataSource } from '../src/infrastructure/typeorm/repository-context.ts';
import { createStorefrontApi } from '../client/src/infrastructure/storefront-api.ts';
import { MovementSummary, InventoryHistory } from '../client/src/presentation/components/InventoryHistory/index.tsx';
import { Sessions } from '../src/infrastructure/security/primitives.ts';
import { createApp } from '../src/adapters/http/server.ts';
import { createTypeOrmFixture } from '../test-support/typeorm.mjs';

const validation = error => error.code === 'VALIDATION';
const input = { type: 'REPOSICAO', reason: 'Reposição de teste', actorId: '1', actorRole: 'ADMIN', origin: 'ADMINISTRATIVO' };

test('filtros validam IDs, tipos, datas reais e período inclusivo', () => {
  assert.deepEqual(validateInventoryFilter({}), { page: 1 });
  assert.deepEqual(validateInventoryFilter({ page: '2', productId: '3', actorId: '4', orderId: '5', type: 'VENDA', from: '2026-10-20', to: '2026-10-20' }),
    { page: 2, productId: '3', actorId: '4', orderId: '5', type: 'VENDA', from: '2026-10-20', to: '2026-10-20' });
  for (const value of [null, [], { role: 'ADMIN' }, { productId: ['1'] }, { actorId: '0' }, { orderId: '1 OR 1=1' },
    { type: 'AJUSTE' }, { type: ['VENDA'] }, { page: '0' }, { from: '2026-02-30' }, { from: '0000-01-01' },
    { to: '20/10/2026' }, { from: ['2026-10-20'] }, { from: '2026-10-21', to: '2026-10-20' }]) {
    assert.throws(() => validateInventoryFilter(value), validation);
  }
});

test('ajustes exigem motivo normalizado sem aceitar autor, saldo final ou tipo forjados', () => {
  assert.deepEqual(validateStockAdjustment({ expectedStock: 10, delta: 2, reason: '  Reposição de teste  ' }), { expectedStock: 10, delta: 2, reason: 'Reposição de teste' });
  for (const reason of [undefined, '', 'curt', 'x'.repeat(501), 'teste\ninválido']) {
    assert.throws(() => validateStockAdjustment({ expectedStock: 10, delta: 2, reason }), validation);
  }
  for (const field of ['actorId', 'currentStock', 'type']) assert.throws(() => validateStockAdjustment({ expectedStock: 10, delta: 2, reason: 'Teste válido', [field]: '1' }), validation);
});

test('serviço exige administrador antes de validar ou acessar auditoria', async () => {
  const calls = [];
  const repository = { list: async (...args) => { calls.push(args); return { items: [] }; } };
  for (const [identity, user, code] of [[null, { role: 'ADMIN' }, 'UNAUTHORIZED'], ['1', null, 'UNAUTHORIZED'], ['1', { role: 'CLIENTE' }, 'FORBIDDEN']]) {
    await assert.rejects(new ListStockMovementsService(repository, { findActiveById: async () => user }).execute(identity, {}), error => error.code === code);
  }
  assert.equal(calls.length, 0);
  const service = new ListStockMovementsService(repository, { findActiveById: async () => ({ role: 'ADMIN' }) });
  await service.execute('7', { type: 'VENDA', page: '2' });
  assert.deepEqual(calls, [['7', { page: 2, type: 'VENDA' }]]);
});

function ledgerFixture({ failAudit = false, conflict = false } = {}) {
  const state = { stock: 10, movements: [] };
  const manager = {
    queryRunner: { isTransactionActive: true },
    create: (target, values) => ({ ...values }),
    existsBy: async () => true,
    update: async (target, criteria, values) => {
      if (conflict || criteria.stock !== state.stock) return { affected: 0 };
      state.stock = values.stock;
      return { affected: 1 };
    },
    save: async (target, values) => {
      assert.equal(target, StockMovement);
      if (failAudit) throw new Error('Auditoria indisponível');
      state.movements.push(values);
      return values;
    }
  };
  async function transaction(operation) {
    const previous = structuredClone(state);
    try { return await operation(manager); }
    catch (error) { Object.assign(state, previous); throw error; }
  }
  return { state, manager, transaction, product: { id: '1', name: 'Cupcake teste', stock: 10 } };
}

test('estoque e auditoria usam a mesma transação, com saldos e autor coerentes', async () => {
  const fixture = ledgerFixture();
  await fixture.transaction(manager => changeStock(manager, fixture.product, 2, input));
  assert.equal(fixture.state.stock, 12);
  assert.equal(fixture.state.movements.length, 1);
  assert.deepEqual(fixture.state.movements[0], { productId: '1', productName: 'Cupcake teste', previousStock: 10, quantity: 2,
    currentStock: 12, ...input, orderId: null, paymentId: null, cancellationId: null });
  assert.equal(fixture.product.stock, 12);
});

test('falha ao inserir auditoria reverte a alteração de estoque', async () => {
  const fixture = ledgerFixture({ failAudit: true });
  await assert.rejects(fixture.transaction(manager => changeStock(manager, fixture.product, 2, input)), /Auditoria indisponível/);
  assert.equal(fixture.state.stock, 10);
  assert.equal(fixture.product.stock, 10);
  assert.equal(fixture.state.movements.length, 0);
});

test('saldo concorrente, limites e ausência de transação impedem a movimentação', async () => {
  const fixture = ledgerFixture({ conflict: true });
  await assert.rejects(fixture.transaction(manager => changeStock(manager, fixture.product, 2, input)), error => error.code === 'CONFLICT');
  assert.equal(fixture.state.movements.length, 0);
  for (const quantity of [0, -11, 1.5, 2147483647]) await assert.rejects(changeStock(fixture.manager, fixture.product, quantity, input), error => error.code === 'CONFLICT');
  await assert.rejects(changeStock({ ...fixture.manager, queryRunner: undefined }, fixture.product, 2, input), /transação ativa/);
});

test('cadastro com estoque zero gera inicialização e importação sem histórico recebe abertura explícita', async () => {
  const fixture = ledgerFixture();
  await recordInitialStock(fixture.manager, { ...fixture.product, stock: 0 }, '7');
  assert.equal(fixture.state.movements[0].type, 'INICIALIZACAO');
  assert.equal(fixture.state.movements[0].quantity, 0);
  assert.equal(fixture.state.movements[0].actorId, '7');
  fixture.manager.existsBy = async () => false;
  await fixture.transaction(manager => changeStock(manager, fixture.product, 2, input));
  assert.equal(fixture.state.movements[1].type, 'ABERTURA');
  assert.equal(fixture.state.movements[1].actorId, null);
  assert.equal(fixture.state.movements[1].currentStock, 10);
});

test('consulta revalida perfil e usa filtros parametrizados, fuso explícito e desempate por ID', async () => {
  const calls = [];
  const query = {};
  for (const method of ['andWhere', 'orderBy', 'addOrderBy', 'skip', 'take']) query[method] = (...args) => { calls.push([method, ...args]); return query; };
  query.getManyAndCount = async () => [[{ id: '1', createdAt: new Date('2026-10-20T12:00:00Z') }], 1];
  const manager = { findOne: async () => ({ role: 'ADMIN' }), getRepository: () => ({ createQueryBuilder: () => query }) };
  const source = { isInitialized: true, getRepository: target => { assert.equal(target, StockMovement); return { manager: { transaction: async (isolation, operation) => { assert.equal(isolation, 'REPEATABLE READ'); return operation(manager); } } }; } };
  const repository = withDataSource(source, () => new InventoryRepository());
  const result = await repository.list('7', { page: 2, productId: '3', actorId: '4', orderId: '5', type: 'VENDA', from: '2026-10-20', to: '2026-10-20' });
  assert.equal(result.items[0].createdAt, '2026-10-20T12:00:00.000Z');
  assert.ok(calls.some(call => call[1] === 'movement.productId = :productId' && call[2].productId === '3'));
  assert.ok(calls.some(call => typeof call[1] === 'string' && call[1].includes('America/Sao_Paulo') && call[2]?.to === '2026-10-20'));
  assert.deepEqual(calls.slice(-4), [['orderBy', 'movement.createdAt', 'DESC'], ['addOrderBy', 'movement.id', 'DESC'], ['skip', 20], ['take', 20]]);
  manager.findOne = async () => ({ role: 'CLIENTE' });
  await assert.rejects(repository.list('7', { page: 1 }), error => error.code === 'FORBIDDEN');
});

test('migração é aditiva, registra abertura sob bloqueio e protege histórico imutável', async () => {
  const statements = [];
  const migration = new CreateStockMovements1792537200000();
  await migration.up({ query: async sql => statements.push(sql) });
  assert.match(statements[0], /LOCK TABLE public.produto/);
  assert.ok(statements.some(sql => /INSERT INTO public.movimentacao_estoque/.test(sql) && /histórico anterior não reconstruído/.test(sql)));
  assert.ok(statements.some(sql => /saldo_anterior::BIGINT \+ quantidade::BIGINT/.test(sql)));
  for (const expression of [/venda_unica/, /devolucao_unica/, /abertura_unica/, /BEFORE UPDATE OR DELETE/, /BEFORE TRUNCATE/]) assert.ok(statements.some(sql => expression.test(sql)));
  assert.ok(statements.every(sql => !/DROP TABLE|UPDATE public.produto|DELETE FROM/.test(sql)));
  await assert.rejects(migration.down(), /preservar/);
  const source = createDataSource();
  await source.buildMetadatas();
  assert.equal(source.getMetadata(StockMovement).tablePath, 'public.movimentacao_estoque');
  assert.equal(source.options.synchronize, false);
  assert.equal(source.options.migrationsRun, false);
});

test('Axios envia somente filtros e paginação para a consulta administrativa', async () => {
  const calls = [];
  const api = createStorefrontApi({ get: async (...args) => { calls.push(args); return { data: { movements: { items: [] } } }; }, post() { throw new Error('Histórico é somente leitura'); } });
  const signal = new AbortController().signal;
  await api.stockMovements(2, { type: 'VENDA', productId: '3' }, signal);
  assert.deepEqual(calls, [['/admin/stock-movements', { signal, params: { page: 2, type: 'VENDA', productId: '3' } }]]);
});

test('interface apresenta saldos, autor e vínculos sem permitir editar ou executar HTML do motivo', () => {
  const movement = { id: '1', productId: '3', productName: 'Cupcake teste', type: 'DEVOLUCAO', quantity: 2,
    previousStock: 8, currentStock: 10, reason: '<script>teste</script>', actorId: '7', actorRole: 'CLIENTE', origin: 'SISTEMA',
    orderId: '4', paymentId: '5', cancellationId: '6', createdAt: '2026-10-20T12:00:00Z' };
  const markup = renderToStaticMarkup(React.createElement(MovementSummary, { movement }));
  for (const text of ['Saldo anterior', 'Saldo posterior', '+2', 'CLIENTE #7', 'Pedido #4', 'Cancelamento #6', '&lt;script&gt;']) assert.ok(markup.includes(text), text);
  assert.doesNotMatch(markup, /<script>|<form|<button/);
  const page = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(InventoryHistory, { api: { stockMovements: async () => { throw new Error('Não consultar durante render'); } } })));
  assert.match(page, /Histórico de estoque/);
  assert.match(page, /ID do usuário responsável/);
});

test('HTTP bloqueia visitante e cliente na auditoria, mesmo com cabeçalho ADMIN forjado', async context => {
  const sessions = new Sessions();
  const app = createApp({ dataSource: createTypeOrmFixture(), sessions, passwords: {} }, { logger: { error() {} } });
  const server = await new Promise(resolve => { const listening = app.listen(0, '127.0.0.1', () => resolve(listening)); });
  context.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const url = `http://127.0.0.1:${server.address().port}/api/admin/stock-movements`;
  assert.equal((await fetch(url)).status, 401);
  assert.equal((await fetch(url, { headers: { Cookie: `cupcake_session=${sessions.create('1')}`, 'X-Role': 'ADMIN' } })).status, 403);
});
