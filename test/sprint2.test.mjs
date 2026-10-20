import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProductFilters } from '../src/modules/catalog/validators/parseProductFilters.ts';
import { ListProductsService } from '#catalog-usecases/listProducts/ListProductsService';
import { ProductsRepository } from '#repositories/ProductsRepository';
import { withDataSource } from '#infrastructure/typeorm/repository-context';
import { createTypeOrmFixture } from '../test-support/typeorm.mjs';
import { ChangeCartService } from '#cart-usecases/changeCart/ChangeCartService';
import { GetCartService } from '#cart-usecases/getCart/GetCartService';
import { MergeCartService } from '#cart-usecases/mergeCart/MergeCartService';
import { summarize, cents, money } from '../src/modules/cart/entities/cart-summary.ts';
import { resolveCart } from '#http/middlewares/resolve-cart';
import { cartTokenHash, cartCookie } from '#http/helpers/cart-cookie';
import { createStorefrontApi } from '../client/src/infrastructure/storefront-api.ts';
import { createHttpClient } from '../client/src/infrastructure/http-client.ts';
import { formatPrice } from '../client/src/presentation/format-price.ts';
import { CartsRepository } from '#repositories/CartsRepository';
import { Cart } from '#entities/Cart';
import { CartItem } from '#entities/CartItem';
import { Product } from '#entities/Product';

test('filtros normalizam preços e combinam busca, categoria e faixa', () => {
  assert.deepEqual(parseProductFilters({ q: '  Chocolate ', category: '2', minPrice: '0', maxPrice: '12.9' }),
    { q: 'Chocolate', category: '2', minPrice: '0.00', maxPrice: '12.90' });
  assert.deepEqual(parseProductFilters({ q: ' ', category: '', minPrice: '', maxPrice: '' }), {});
});

test('filtros rejeitam arrays, operadores, preços inválidos e faixas invertidas', async () => {
  for (const input of [null, [], { q: ['a', 'b'] }, { category: '1 OR 1=1' }, { minPrice: '-1' },
    { minPrice: '1e2' }, { maxPrice: '0.001' }, { minPrice: '10000000000' }, { minPrice: '2', maxPrice: '1' }]) {
    let calls = 0;
    const service = new ListProductsService({ listActive: async () => { calls++; return []; } });
    await assert.rejects(service.execute(input), error => error.code === 'VALIDATION');
    assert.equal(calls, 0);
  }
});

test('busca usa parâmetros e trata curingas como texto literal', async () => {
  const source = createTypeOrmFixture();
  const repository = withDataSource(source, () => new ProductsRepository());
  await repository.listActive({ q: "50%_\\' OR 1=1", category: '2', minPrice: '1.00', maxPrice: '10.00' });
  const conditions = source.events.filter(event => event.type === 'andWhere');
  assert.deepEqual(conditions[0].values, { search: "%50\\%\\_\\\\' OR 1=1%" });
  assert.ok(conditions.every(event => !event.condition.includes('OR 1=1')));
  assert.deepEqual(conditions.slice(1).map(event => event.values), [{ category: '2' }, { minPrice: '1.00' }, { maxPrice: '10.00' }]);
});

test('resumo monetário usa centavos inteiros e não sofre arredondamento binário', () => {
  const items = [{ productId: '1', name: 'Teste', quantity: 3, unitPrice: '0.10', lineTotal: '0.30', stock: 5, available: true }];
  assert.equal(summarize(items).total, '0.30');
  assert.equal(summarize(items).totalQuantity, 3);
  assert.equal(money(cents('9999999999.99') * 99n), '989999999999.01');
  assert.deepEqual(summarize([]), { items: [], warnings: [], totalQuantity: 0, total: '0.00' });
});

test('carrinho valida quantidades e ignora preços enviados pelo navegador', async () => {
  const access = { owner: { kind: 'guest', id: 'hash' }, guestHash: 'hash' };
  const changes = [];
  const service = new ChangeCartService({ change: async (...args) => { changes.push(args); return summarize([]); } }, {});
  for (const quantity of [0, -1, 1.5, '2', 100, null, undefined]) {
    await assert.rejects(service.execute(access, 'add', '1', quantity), error => error.code === 'VALIDATION');
  }
  assert.equal(changes.length, 0);
  await service.execute(access, 'add', '1', 2);
  assert.deepEqual(changes, [[access.owner, { operation: 'add', productId: '1', quantity: 2 }]]);
  await service.execute(access, 'remove', '1', undefined);
  assert.equal(changes[1][1].quantity, 0);
});

test('conta inativa e visitante não podem incorporar carrinho de cliente', async () => {
  let calls = 0;
  const carts = { merge: async () => { calls++; }, get: async () => { calls++; } };
  const inactive = { owner: { kind: 'user', id: '1' }, guestHash: 'hash' };
  await assert.rejects(new MergeCartService(carts, { findActiveById: async () => null }).execute(inactive), error => error.code === 'UNAUTHORIZED');
  await assert.rejects(new GetCartService(carts, { findActiveById: async () => null }).execute(inactive), error => error.code === 'UNAUTHORIZED');
  await assert.rejects(new MergeCartService(carts, {}).execute({ owner: { kind: 'guest', id: 'hash' }, guestHash: 'hash' }), error => error.code === 'UNAUTHORIZED');
  assert.equal(calls, 0);
});

test('identidade do carrinho vem de cookie opaco ou sessão, nunca do corpo', () => {
  const token = 'a'.repeat(64);
  const request = { headers: { cookie: `cupcake_cart=${token}` }, body: { userId: 'forjado', cartId: 'outro' },
    app: { locals: { dependencies: { origin: 'https://localhost' } } } };
  resolveCart(request, { append() { throw new Error('Cookie válido não precisa ser reemitido'); } }, () => {});
  assert.equal(request.cartAccess.owner.id, cartTokenHash(token));
  assert.notEqual(request.cartAccess.owner.id, token);
  request.authentication = { userId: 'real' };
  resolveCart(request, {}, () => {});
  assert.deepEqual(request.cartAccess, { owner: { kind: 'user', id: 'real' }, guestHash: cartTokenHash(token) });
  assert.match(cartCookie(token, 'https://localhost'), /HttpOnly; SameSite=Strict.*; Secure$/);
});

test('Axios envia filtros e operações de carrinho sem preços ou identidade', async () => {
  const requests = [];
  const api = createStorefrontApi(createHttpClient({ adapter: async config => {
    requests.push(config);
    return { config, status: 200, statusText: 'OK', headers: {}, data: { products: [], cart: summarize([]) } };
  } }));
  await api.products(undefined, { q: 'Chocolate', minPrice: '1.00' });
  await api.addCartItem('1', 2);
  await api.setCartQuantity('1', 3);
  await api.removeCartItem('1');
  await api.mergeCart();
  assert.deepEqual(requests[0].params, { q: 'Chocolate', minPrice: '1.00' });
  assert.deepEqual(JSON.parse(requests[1].data), { productId: '1', quantity: 2 });
  assert.deepEqual(requests.slice(1).map(request => request.url), ['/cart/items', '/cart/items/1/quantity', '/cart/items/1/remove', '/cart/merge']);
});

test('formatação preserva centavos mesmo em totais maiores que a precisão de Number', () => {
  assert.equal(formatPrice('98999999999901.01'), 'R$\u00a098.999.999.999.901,01');
  assert.equal(formatPrice('0.30'), 'R$\u00a00,30');
});

test('incorporação bloqueia proprietários em ordem estável e usa parâmetros SQL', async () => {
  const keys = [];
  const manager = {
    query: async (sql, values) => { assert.equal(sql, 'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))'); keys.push(values[0]); },
    getRepository: () => ({ findOneBy: async () => null })
  };
  const source = { isInitialized: true, getRepository: () => ({ manager: { transaction: operation => operation(manager) } }) };
  const repository = withDataSource(source, () => new CartsRepository());
  await repository.merge('7', 'hash');
  assert.deepEqual(keys, ['cart:guest:hash', 'cart:user:7']);
});

test('falha na gravação do item é propagada pela transação, sem confirmação', async () => {
  const events = [];
  const expected = new Error('Falha simulada');
  const manager = {
    query: async () => {},
    getRepository: target => {
      if (target === Cart) return { findOneBy: async () => ({ id: '1' }) };
      if (target === CartItem) return { findOneBy: async () => null, countBy: async () => 0, create: input => input, save: async () => { throw expected; } };
      if (target === Product) return { findOne: async () => ({ id: '1', stock: 5 }) };
      throw new Error('Entidade inesperada');
    }
  };
  const source = { isInitialized: true, getRepository: () => ({ manager: { transaction: async operation => {
    events.push('BEGIN');
    try { const result = await operation(manager); events.push('COMMIT'); return result; }
    catch (error) { events.push('ROLLBACK'); throw error; }
  } } }) };
  const repository = withDataSource(source, () => new CartsRepository());
  await assert.rejects(repository.change({ kind: 'guest', id: 'hash' }, { productId: '1', quantity: 1, operation: 'add' }), error => error === expected);
  assert.deepEqual(events, ['BEGIN', 'ROLLBACK']);
});
