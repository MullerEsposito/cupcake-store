import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { requireAdministrator } from '../src/modules/users/validators/requireAdministrator.ts';
import { orderStatuses, nextOrderStatus, validateTransition } from '../src/modules/orders/entities/order-status.ts';
import { validatePage, validateOrderFilter, validateProductWrite, validateCategoryWrite, validateStockAdjustment, validateOrderTransition } from '../src/modules/admin/validators/admin-input.ts';
import { SaveProductService } from '../src/modules/admin/useCases/saveProduct/SaveProductService.ts';
import { AdvanceOrderService } from '../src/modules/admin/useCases/advanceOrder/AdvanceOrderService.ts';
import { GetOrderService } from '../src/modules/orders/useCases/getOrder/GetOrderService.ts';
import { createStorefrontApi } from '../client/src/infrastructure/storefront-api.ts';
import { OrderProgress } from '../client/src/presentation/components/OrderProgress.tsx';
import { statusLabel, nextStatus } from '../client/src/presentation/order-status.ts';
import { createApp } from '../src/adapters/http/server.ts';
import { Sessions } from '#infrastructure/security/primitives';
import { createTypeOrmFixture } from '../test-support/typeorm.mjs';

const validation = error => error.code === 'VALIDATION';
const administrator = { findActiveById: async id => ({ id, role: 'ADMIN', active: true }) };
const client = { findActiveById: async id => ({ id, role: 'CLIENTE', active: true }) };
const product = { name: 'Cupcake teste', description: '', price: '12.9', weight: '85',
  image: '/cupcake.svg', categoryId: '1', active: true, initialStock: 5 };

test('autorização distingue visitante, cliente, administrador e conta revogada', async () => {
  await assert.rejects(requireAdministrator(null, administrator), error => error.code === 'UNAUTHORIZED');
  await assert.rejects(requireAdministrator('1', client), error => error.code === 'FORBIDDEN');
  await assert.rejects(requireAdministrator('1', { findActiveById: async () => null }), error => error.code === 'UNAUTHORIZED');
  assert.equal(await requireAdministrator('1', administrator), '1');
});

test('produto normaliza decimais respeitando limites do banco e impede alteração direta de estoque na edição', () => {
  const normalized = validateProductWrite(product, false);
  assert.equal(normalized.price, '12.90');
  assert.equal(normalized.weight, '85.000');
  assert.equal(normalized.initialStock, 5);
  for (const input of [{ ...product, price: '-1' }, { ...product, price: '1.001' }, { ...product, weight: '10000000' },
    { ...product, initialStock: 2147483648 }, { ...product, initialStock: '5' }, { ...product, active: 'true' },
    { ...product, role: 'ADMIN' }, { ...product, name: '' }]) assert.throws(() => validateProductWrite(input, false), validation);
  const { initialStock, ...fields } = product;
  const editing = { ...fields, revision: 'a'.repeat(64) };
  assert.equal(validateProductWrite(editing, true).revision, editing.revision);
  assert.throws(() => validateProductWrite({ ...editing, stock: 99 }, true), validation);
  assert.throws(() => validateProductWrite({ ...editing, initialStock }, true), validation);
  assert.throws(() => validateProductWrite({ ...editing, revision: 'old' }, true), validation);
});

test('imagem administrativa não permite protocolos executáveis nem credenciais na URL', () => {
  for (const image of ['javascript:alert(1)', 'data:image/svg+xml,abc', '//evil.test/image', 'http://test/image', 'https://user:secret@test/image']) {
    assert.throws(() => validateProductWrite({ ...product, image }, false), validation);
  }
  assert.equal(validateProductWrite({ ...product, image: 'https://example.test/image.png' }, false).image, 'https://example.test/image.png');
});

test('categoria e paginação rejeitam excesso de campos, arrays e valores fora do contrato', () => {
  assert.deepEqual(validateCategoryWrite({ name: 'Categoria', description: null, active: false }, false), { name: 'Categoria', description: null, active: false });
  assert.throws(() => validateCategoryWrite({ name: 'Categoria', description: null, active: true, id: '1' }, false), validation);
  assert.deepEqual(validatePage({}), { page: 1 });
  assert.deepEqual(validatePage({ page: '12' }), { page: 12 });
  for (const page of [0, '0', '-1', ['1'], '1.1', '1000000']) assert.throws(() => validatePage({ page }), validation);
  assert.deepEqual(validateOrderFilter({ page: '2', status: 'ENTREGUE' }), { page: 2, status: 'ENTREGUE' });
  assert.throws(() => validateOrderFilter({ status: 'PAGO' }), validation);
});

test('ajuste de estoque exige comparação com saldo lido e variação inteira não nula', () => {
  assert.deepEqual(validateStockAdjustment({ expectedStock: 10, delta: -3 }), { expectedStock: 10, delta: -3 });
  for (const input of [{ expectedStock: -1, delta: 2 }, { expectedStock: 10, delta: 0 },
    { expectedStock: 10, delta: 1.5 }, { expectedStock: 10, delta: '3' }, { expectedStock: 10, delta: 3, userId: '1' }]) {
    assert.throws(() => validateStockAdjustment(input), validation);
  }
});

test('máquina de estados permite somente três avanços após pagamento aprovado', () => {
  for (const expectedStatus of orderStatuses) for (const status of orderStatuses) {
    if (nextOrderStatus[expectedStatus] === status) {
      assert.doesNotThrow(() => validateTransition(expectedStatus, status));
      assert.deepEqual(validateOrderTransition({ expectedStatus, status }), { expectedStatus, status });
    } else assert.throws(() => validateOrderTransition({ expectedStatus, status }), error => error.code === 'CONFLICT');
  }
  assert.throws(() => validateOrderTransition({ expectedStatus: 'FORJADO', status: 'ENTREGUE' }), validation);
});

test('serviços administrativos negam acesso antes de validar ou gravar dados', async () => {
  let accessed = false;
  const repository = { saveProduct() { accessed = true; }, advanceOrder() { accessed = true; } };
  await assert.rejects(new SaveProductService(repository, client).execute('1', undefined, product), error => error.code === 'FORBIDDEN');
  await assert.rejects(new AdvanceOrderService(repository, client).execute('1', '1', {}), error => error.code === 'FORBIDDEN');
  assert.equal(accessed, false);
  const calls = [];
  await new SaveProductService({ saveProduct: async (...args) => calls.push(args) }, administrator).execute('7', undefined, product);
  assert.deepEqual(calls, [['7', undefined, validateProductWrite(product, false)]]);
});

test('consulta de acompanhamento envia identidade autenticada e valida id antes do repositório', async () => {
  const calls = [];
  const repository = { find: async (...args) => { calls.push(args); return { id: '9' }; } };
  assert.deepEqual(await new GetOrderService(repository, client).execute('7', '9'), { id: '9' });
  assert.deepEqual(calls, [['7', '9']]);
  await assert.rejects(new GetOrderService(repository, client).execute('7', '0'), validation);
  await assert.rejects(new GetOrderService(repository, client).execute(null, '9'), error => error.code === 'UNAUTHORIZED');
});

test('indicador de acompanhamento expõe etapa atual sem marcar etapas futuras como concluídas', () => {
  const markup = renderToStaticMarkup(React.createElement(OrderProgress, { status: 'EM_PREPARACAO' }));
  assert.match(markup, /aria-current="step"/);
  assert.equal((markup.match(/class="reached"/g) ?? []).length, 3);
  assert.equal((markup.match(/aria-current/g) ?? []).length, 1);
  for (const [current, target] of Object.entries(nextOrderStatus)) assert.equal(nextStatus(current), target);
  assert.equal(nextStatus('AGUARDANDO_PAGAMENTO'), null);
  assert.equal(nextStatus('ENTREGUE'), null);
  assert.equal(statusLabel('CANCELADO'), 'Cancelado');
});

test('gateway Axios mantém endpoints administrativos e acompanhamento isolados', async () => {
  const calls = [];
  const api = createStorefrontApi({
    get: async (...args) => { calls.push(['GET', ...args]); return { data: { catalog: {}, orders: {}, order: {} } }; },
    post: async (...args) => { calls.push(['POST', ...args]); return { data: { product: {}, category: {}, order: {} } }; }
  });
  await api.adminCatalog(2);
  await api.adminOrders(3, 'ENTREGUE');
  await api.saveProduct(null, product);
  await api.saveProduct('1', product);
  await api.saveCategory(null, {});
  await api.saveCategory('1', {});
  await api.adjustStock('1', { expectedStock: 1, delta: 2 });
  await api.advanceOrder('1', { expectedStatus: 'PAGAMENTO_APROVADO', status: 'EM_PREPARACAO' });
  await api.order('1');
  assert.deepEqual(calls.map(call => call.slice(0, 2)), [['GET', '/admin/catalog'], ['GET', '/admin/orders'],
    ['POST', '/admin/products'], ['POST', '/admin/products/1'], ['POST', '/admin/categories'], ['POST', '/admin/categories/1'],
    ['POST', '/admin/products/1/stock'], ['POST', '/admin/orders/1/status'], ['GET', '/orders/1']]);
});

test('HTTP impede visitante e cliente mesmo com perfil ADMIN forjado em cabeçalho ou corpo', async () => {
  const sessions = new Sessions();
  const identity = `cupcake_session=${sessions.create('1')}`;
  const app = createApp({ dataSource: createTypeOrmFixture(), sessions, passwords: {} }, { logger: { error() {} } });
  const server = await new Promise(resolve => { const listening = app.listen(0, '127.0.0.1', () => resolve(listening)); });
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ['/api/admin/catalog', '/api/admin/orders']) {
      assert.equal((await fetch(url + path)).status, 401);
      assert.equal((await fetch(url + path, { headers: { Cookie: identity, 'X-Role': 'ADMIN' } })).status, 403);
    }
    for (const path of ['/api/admin/products', '/api/admin/products/1', '/api/admin/categories', '/api/admin/categories/1', '/api/admin/products/1/stock', '/api/admin/orders/1/status']) {
      const request = { method: 'POST', headers: { Origin: 'http://localhost:3000', 'X-Cupcake-Request': '1', 'Content-Type': 'application/json', Cookie: identity }, body: '{"role":"ADMIN"}' };
      assert.equal((await fetch(url + path, request)).status, 403);
    }
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
