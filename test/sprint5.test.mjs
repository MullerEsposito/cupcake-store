import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { validateCancellation, validateCancellationState, validateCancellationPayment } from '../src/modules/orders/validators/validateCancellation.ts';
import { CancelOrderService } from '../src/modules/orders/useCases/cancelOrder/CancelOrderService.ts';
import { AdminCancelOrderService } from '../src/modules/admin/useCases/adminCancelOrder/AdminCancelOrderService.ts';
import { CreateOrderCancellations1792454400000 } from '../src/infrastructure/typeorm/migrations/1792454400000-CreateOrderCancellations.ts';
import { OrderCancellation } from '#entities/OrderCancellation';
import { Order } from '#entities/Order';
import { createDataSource } from '../src/infrastructure/typeorm/data-source.ts';
import { CancellationForm, CancellationSummary } from '../client/src/presentation/components/Cancellation.tsx';
import { canCancel } from '../client/src/contracts/cancellation.ts';
import { createStorefrontApi } from '../client/src/infrastructure/storefront-api.ts';
import { createApp } from '../src/adapters/http/server.ts';
import { Sessions } from '#infrastructure/security/primitives';
import { createTypeOrmFixture } from '../test-support/typeorm.mjs';

const input = { reason: '  Compra duplicada  ', expectedStatus: 'PAGAMENTO_APROVADO', idempotencyKey: 'cancelamento-teste-123' };
const validation = error => error.code === 'VALIDATION';
const customer = { findActiveById: async id => ({ id, role: 'CLIENTE', active: true }) };
const administrator = { findActiveById: async id => ({ id, role: 'ADMIN', active: true }) };

test('cancelamento valida motivo, estado esperado e chave, sem aceitar estorno ou identidade do navegador', () => {
  assert.deepEqual(validateCancellation(input), { ...input, reason: 'Compra duplicada' });
  for (const value of [null, [], { ...input, reason: 'curt' }, { ...input, reason: 'x'.repeat(501) }, { ...input, reason: 'teste\u0000' },
    { ...input, expectedStatus: 'SAIU_PARA_ENTREGA' }, { ...input, expectedStatus: ['EM_PREPARACAO'] },
    { ...input, idempotencyKey: '' }, { ...input, refundAmount: '999.00' }, { ...input, userId: '1' },
    { ...input, role: 'ADMIN' }, { ...input, stockRestored: true }]) assert.throws(() => validateCancellation(value), validation);
});

test('cancelamento exige estado ainda cancelável e confirmação do estado atual', () => {
  const statuses = ['AGUARDANDO_PAGAMENTO', 'PAGAMENTO_APROVADO', 'EM_PREPARACAO', 'SAIU_PARA_ENTREGA', 'ENTREGUE', 'CANCELADO'];
  for (const status of statuses) for (const expected of statuses.slice(0, 3)) {
    if (status === expected) assert.doesNotThrow(() => validateCancellationState(status, expected));
    else assert.throws(() => validateCancellationState(status, expected), error => error.code === 'CONFLICT');
  }
  for (const status of statuses) assert.equal(canCancel(status), statuses.slice(0, 3).includes(status));
});

test('estorno só é aplicável a pagamento aprovado coerente, inclusive pedido gratuito', () => {
  assert.doesNotThrow(() => validateCancellationPayment('AGUARDANDO_PAGAMENTO', '10.00', null));
  assert.doesNotThrow(() => validateCancellationPayment('PAGAMENTO_APROVADO', '10.00', { amount: '10.00', simulated: true }));
  assert.doesNotThrow(() => validateCancellationPayment('EM_PREPARACAO', '0.00', { amount: '0.00', simulated: true }));
  for (const [status, payment] of [['AGUARDANDO_PAGAMENTO', { amount: '10.00', simulated: true }],
    ['PAGAMENTO_APROVADO', null], ['EM_PREPARACAO', { amount: '10.00', simulated: false }],
    ['PAGAMENTO_APROVADO', { amount: '0.01', simulated: true }]]) {
    assert.throws(() => validateCancellationPayment(status, '10.00', payment), error => error.code === 'CONFLICT');
  }
});

test('serviços revalidam autenticação e perfil antes de acessar o contrato de cancelamento', async () => {
  let accessed = false;
  const repository = { cancel() { accessed = true; }, cancelAsAdministrator() { accessed = true; } };
  await assert.rejects(new CancelOrderService(repository, customer).execute(null, '1', input), error => error.code === 'UNAUTHORIZED');
  await assert.rejects(new AdminCancelOrderService(repository, customer).execute('1', '1', input), error => error.code === 'FORBIDDEN');
  await assert.rejects(new CancelOrderService(repository, { findActiveById: async () => null }).execute('1', '1', input), error => error.code === 'UNAUTHORIZED');
  assert.equal(accessed, false);
  const calls = [];
  const port = { cancel: async (...args) => calls.push(['customer', ...args]), cancelAsAdministrator: async (...args) => calls.push(['admin', ...args]) };
  await new CancelOrderService(port, customer).execute('7', '9', input);
  await new AdminCancelOrderService(port, administrator).execute('8', '9', input);
  assert.deepEqual(calls, [['customer', '7', '9', validateCancellation(input)], ['admin', '8', '9', validateCancellation(input)]]);
});

test('migração é aditiva e inclui garantias de unicidade, integridade e preservação da auditoria', async () => {
  const queries = [];
  const migration = new CreateOrderCancellations1792454400000();
  await migration.up({ query: async sql => queries.push(sql) });
  assert.equal(queries.length, 1);
  assert.match(queries[0], /CREATE TABLE public\.cancelamento_pedido/);
  assert.match(queries[0], /pedido_id BIGINT NOT NULL UNIQUE/);
  assert.match(queries[0], /pagamento_id BIGINT UNIQUE/);
  assert.match(queries[0], /chave_idempotencia VARCHAR\(128\) NOT NULL UNIQUE/);
  assert.match(queries[0], /ON DELETE RESTRICT/);
  assert.match(queries[0], /CHECK \(simulado\)/);
  assert.doesNotMatch(queries[0], /DROP|TRUNCATE|ALTER TABLE/);
  await assert.rejects(migration.down(), /preservar/);
});

test('DataSource registra auditoria e migração sem executá-la automaticamente', async () => {
  const source = createDataSource();
  await source.buildMetadatas();
  const metadata = source.getMetadata(OrderCancellation);
  assert.equal(metadata.tablePath, 'public.cancelamento_pedido');
  assert.equal(metadata.findColumnWithPropertyName('refundAmount').precision, 12);
  assert.equal(metadata.findColumnWithPropertyName('refundAmount').scale, 2);
  assert.equal(metadata.findColumnWithPropertyName('simulated').default, true);
  assert.equal(source.options.synchronize, false);
  assert.equal(source.options.migrationsRun, false);
  assert.deepEqual(source.options.migrations, [CreateOrderCancellations1792454400000]);
});

test('interface exige confirmação explícita e apresenta estorno como simulação com motivo escapado', () => {
  const form = renderToStaticMarkup(React.createElement(CancellationForm, { status: 'PAGAMENTO_APROVADO', total: '10.00', busy: false, onConfirm: async () => {} }));
  assert.match(form, /<input(?=[^>]*name="confirmed")(?=[^>]*required)[^>]*>/);
  assert.match(form, /<input(?=[^>]*name="reason")(?=[^>]*minLength="5")[^>]*>/i);
  assert.match(form, /Confirmar cancelamento e estorno simulado/);
  assert.match(form, /Nenhum dinheiro real/);
  const summary = renderToStaticMarkup(React.createElement(CancellationSummary, { cancellation: {
    reason: '<script>teste</script>', actorId: '1', actorRole: 'CLIENTE', createdAt: '2026-10-20T12:00:00Z',
    refundStatus: 'SIMULADO', refundAmount: '10.00', refundedAt: '2026-10-20T12:00:00Z', stockRestored: true
  } }));
  assert.match(summary, /&lt;script&gt;/);
  assert.doesNotMatch(summary, /<script>/);
  assert.match(summary, /Estorno simulado concluído/);
});

test('Axios usa endpoints separados de cliente e administrador, sem repetir operações automaticamente', async () => {
  const calls = [];
  const api = createStorefrontApi({ get() {}, post: async (...args) => { calls.push(args); return { data: { order: { id: '9' } } }; } });
  await api.cancelOrder('9', input);
  await api.adminCancelOrder('9', input);
  assert.deepEqual(calls, [['/orders/9/cancel', input], ['/admin/orders/9/cancel', input]]);
});

test('HTTP bloqueia visitante e falso administrador antes de qualquer cancelamento', async () => {
  const sessions = new Sessions();
  const cookie = `cupcake_session=${sessions.create('1')}`;
  const source = createTypeOrmFixture();
  const getRepository = source.getRepository;
  source.getRepository = target => target === Order ? { manager: {} } : getRepository(target);
  const app = createApp({ dataSource: source, sessions, passwords: {} }, { logger: { error() {} } });
  const server = await new Promise(resolve => { const listening = app.listen(0, '127.0.0.1', () => resolve(listening)); });
  try {
    const url = `http://127.0.0.1:${server.address().port}`;
    const post = (path, body, identity = '') => fetch(url + path, { method: 'POST', headers: {
      Origin: 'http://localhost:3000', 'X-Cupcake-Request': '1', 'Content-Type': 'application/json', Cookie: identity
    }, body: JSON.stringify(body) });
    assert.equal((await post('/api/orders/9/cancel', input)).status, 401);
    assert.equal((await post('/api/admin/orders/9/cancel', input)).status, 401);
    assert.equal((await post('/api/admin/orders/9/cancel', { ...input, role: 'ADMIN' }, cookie)).status, 403);
    assert.equal((await post('/api/orders/9/cancel', { ...input, refundAmount: '999.00' }, cookie)).status, 400);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
