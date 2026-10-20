import { Cart } from '#entities/Cart';
import { CartItem } from '#entities/CartItem';
import { Address } from '#entities/Address';
import { Order } from '#entities/Order';
import { OrderItem } from '#entities/OrderItem';
import { Payment } from '#entities/Payment';
import { withDataSource } from '../src/infrastructure/typeorm/repository-context.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { QueryFailedError } from 'typeorm';
import { createDataSource } from '../src/infrastructure/typeorm/data-source.ts';
import { User } from '../src/modules/users/entities/User.ts';
import { Product } from '../src/modules/catalog/entities/Product.ts';
import { Category } from '../src/modules/catalog/entities/Category.ts';
import { UsersRepository } from '#repositories/UsersRepository';
import { ProductsRepository } from '#repositories/ProductsRepository';
import { createTypeOrmFixture } from '../test-support/typeorm.mjs';

test('DataSource não altera schema automaticamente e mapeia as tabelas existentes', async () => {
  const source = createDataSource();
  assert.equal(source.options.synchronize, false);
  assert.equal(source.options.dropSchema, false);
  assert.equal(source.options.migrationsRun, false);
  assert.equal(source.options.logging, false);
  await source.buildMetadatas();
  const user = source.getMetadata(User);
  const product = source.getMetadata(Product);
  const category = source.getMetadata(Category);
  assert.equal(user.tablePath, 'public.usuario');
  assert.equal(product.tablePath, 'public.produto');
  assert.equal(category.tablePath, 'public.categoria');
  assert.equal(user.findColumnWithPropertyName('passwordHash').databaseName, 'senha_hash');
  assert.equal(user.findColumnWithPropertyName('passwordHash').isSelect, false);
  assert.equal(user.findColumnWithPropertyName('id').type, 'bigint');
  assert.equal(user.findColumnWithPropertyName('id').isGenerated, true);
  for (const metadata of [user, product, category]) {
    assert.equal(metadata.findColumnWithPropertyName('id').generationStrategy, 'identity');
    assert.equal(metadata.findColumnWithPropertyName('id').generatedIdentity, 'ALWAYS');
  }
  assert.equal(user.target, User);
  assert.equal(product.target, Product);
  assert.equal(category.target, Category);
  assert.equal(source.getRepository(Product).target, Product);
  assert.equal(product.findColumnWithPropertyName('price').precision, 12);
  assert.equal(product.findColumnWithPropertyName('price').scale, 2);
  assert.equal(product.findColumnWithPropertyName('weight').scale, 3);
  assert.equal(product.relations[0].joinColumns[0].databaseName, 'categoria_id');
  assert.equal(product.relations[0].onDelete, 'RESTRICT');
  assert.equal(source.isInitialized, false);
});

test('QueryBuilder gera filtros parametrizados e bloqueio FOR UPDATE', async () => {
  const source = createDataSource();
  await source.buildMetadatas();
  const email = "teste' OR 1=1 --";
  const query = source.getRepository(User).createQueryBuilder('account')
    .addSelect('account.passwordHash').where('account.email = :email', { email }).setLock('pessimistic_write');
  const [sql, parameters] = query.getQueryAndParameters();
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /"senha_hash"/);
  assert.equal(sql.includes(email), false);
  assert.deepEqual(parameters, [email]);
});

test('TypeORM preserva perfil CLIENTE e traduz somente erro de e-mail duplicado', async () => {
  const inputs = [];
  const source = createTypeOrmFixture({ register: async input => {
    inputs.push(input);
    return { ...input, id: '1' };
  } });
  const user = await withDataSource(source, () => new UsersRepository()).createClient({ email: 'cliente@example.com', name: 'Cliente', passwordHash: 'hash', role: 'ADMIN' });
  assert.equal(inputs[0].role, 'CLIENTE');
  assert.equal(user.role, 'CLIENTE');
  const driverError = Object.assign(new Error('restrição'), { code: '23505' });
  const duplicate = createTypeOrmFixture({ register: async () => { throw new QueryFailedError('insert', [], driverError); } });
  await assert.rejects(withDataSource(duplicate, () => new UsersRepository()).createClient({}), error => error.code === 'CONFLICT');
  const unexpected = new Error('falha controlada');
  const failure = createTypeOrmFixture({ register: async () => { throw unexpected; } });
  await assert.rejects(withDataSource(failure, () => new UsersRepository()).createClient({}), error => error === unexpected);
});

test('catálogo TypeORM mantém join, ordenação estável e produto ausente', async () => {
  const products = [{ id: '1', price: '12.90', weight: '85.000' }];
  const source = createTypeOrmFixture({ products: async () => products });
  const repository = withDataSource(source, () => new ProductsRepository());
  assert.deepEqual(await repository.listActive(), products);
  assert.equal(await repository.findActiveById('2'), null);
  assert.deepEqual(source.events.find(entry => entry.type === 'join').args, ['product.category', 'category']);
  assert.deepEqual(source.events.find(entry => entry.type === 'where').values, { active: true });
  assert.deepEqual(source.events.find(entry => entry.type === 'orderBy').args, ['product.name', 'ASC']);
  assert.deepEqual(source.events.find(entry => entry.type === 'addOrderBy').args, ['product.id', 'ASC']);
});

test('erro no callback reverte a transação sem confirmar mudanças', async () => {
  const source = createTypeOrmFixture();
  const expected = new Error('callback falhou');
  await assert.rejects(withDataSource(source, () => new UsersRepository()).withLockedUser('cliente@example.com', async () => { throw expected; }), error => error === expected);
  assert.deepEqual(source.events.slice(-2).map(entry => entry.type), ['ROLLBACK', 'RELEASE']);
});

test('adaptadores sem parâmetros resolvem o repositório da conexão ativa', async () => {
  const queries = [];
  const source = createTypeOrmFixture({ user: async id => { queries.push(id); return null; } });
  const users = withDataSource(source, () => new UsersRepository());
  assert.equal(await users.findActiveById('10'), null);
  assert.deepEqual(queries, ['10']);
  assert.equal('dataSource' in users, false);
  const products = withDataSource(source, () => new ProductsRepository());
  assert.equal('dataSource' in products, false);
  assert.deepEqual(await products.listActive(), []);
});

test('classes decoradas preservam defaults e não selecionam senha por padrão', async () => {
  const source = createDataSource();
  await source.buildMetadatas();
  assert.deepEqual(source.options.entities, [User, Product, Category, Cart, CartItem, Address, Order, OrderItem, Payment]);
  const user = source.getMetadata(User);
  assert.equal(user.findColumnWithPropertyName('role').default, 'CLIENTE');
  assert.equal(user.findColumnWithPropertyName('active').default, true);
  assert.equal(user.findColumnWithPropertyName('failedAttempts').default, 0);
  assert.equal(user.findColumnWithPropertyName('blockedUntil').isNullable, true);
  const sql = source.getRepository(User).createQueryBuilder('account').getSql();
  assert.equal(sql.includes('senha_hash'), false);
  const product = source.getMetadata(Product);
  assert.equal(product.findColumnWithPropertyName('categoryId').databaseName, 'categoria_id');
  assert.equal(product.relations[0].inverseEntityMetadata.target, Category);
});
