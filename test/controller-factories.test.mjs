import { withDataSource } from '../src/infrastructure/typeorm/repository-context.ts';
import { User } from '../src/modules/users/entities/User.ts';
import { Product } from '../src/modules/catalog/entities/Product.ts';
import { createTypeOrmFixture } from '../test-support/typeorm.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { composeDependencies } from '../src/composition.ts';
import { UsersRepository } from '#repositories/UsersRepository';
import { ProductsRepository } from '#repositories/ProductsRepository';
import { getRegisterUserController } from '../src/modules/users/useCases/registerUser/index.ts';
import { RegisterUserService } from '../src/modules/users/useCases/registerUser/RegisterUserService.ts';
import { getAuthenticateUserController } from '../src/modules/users/useCases/authenticateUser/index.ts';
import { AuthenticateUserService } from '../src/modules/users/useCases/authenticateUser/AuthenticateUserService.ts';
import { getCurrentUserController } from '../src/modules/users/useCases/getCurrentUser/index.ts';
import { GetCurrentUserService } from '../src/modules/users/useCases/getCurrentUser/GetCurrentUserService.ts';
import { getLogoutUserController } from '../src/modules/users/useCases/logoutUser/index.ts';
import { LogoutUserService } from '../src/modules/users/useCases/logoutUser/LogoutUserService.ts';
import { getListProductsController } from '../src/modules/catalog/useCases/listProducts/index.ts';
import { ListProductsService } from '../src/modules/catalog/useCases/listProducts/ListProductsService.ts';
import { getProductController } from '../src/modules/catalog/useCases/getProduct/index.ts';
import { GetProductService } from '../src/modules/catalog/useCases/getProduct/GetProductService.ts';

test('todas as fábricas criam e injetam seu serviço com dependências explícitas', () => {
  const dependencies = {
    dataSource: createTypeOrmFixture(), passwords: {}, sessions: {}, origin: 'https://cupcake.example', clock: () => 1000
  };
  const createController = factory => withDataSource(dependencies.dataSource, () => factory(dependencies));
  for (const [factory, Service] of [
    [getRegisterUserController, RegisterUserService],
    [getAuthenticateUserController, AuthenticateUserService],
    [getCurrentUserController, GetCurrentUserService],
    [getLogoutUserController, LogoutUserService],
    [getListProductsController, ListProductsService],
    [getProductController, GetProductService]
  ]) {
    const first = createController(factory);
    const second = createController(factory);
    assert.ok(first.service instanceof Service);
    assert.notEqual(first, second);
    assert.notEqual(first.service, second.service);
    assert.equal(typeof first.handle, 'function');
  }
  for (const factory of [getRegisterUserController, getAuthenticateUserController, getCurrentUserController]) {
    const first = createController(factory).service.usersRepository;
    const second = createController(factory).service.usersRepository;
    assert.ok(first instanceof UsersRepository);
    assert.equal(first.repository, dependencies.dataSource.getRepository(User));
    assert.notEqual(first, second);
  }
  for (const factory of [getListProductsController, getProductController]) {
    const first = createController(factory).service.productsRepository;
    const second = createController(factory).service.productsRepository;
    assert.ok(first instanceof ProductsRepository);
    assert.equal(first.repository, dependencies.dataSource.getRepository(Product));
    assert.notEqual(first, second);
  }
  assert.equal(createController(getAuthenticateUserController).service.clock, dependencies.clock);
  for (const factory of [getRegisterUserController, getAuthenticateUserController]) {
    const controller = createController(factory);
    assert.equal(controller.service.sessions, dependencies.sessions);
    assert.equal('sessions' in controller, false);
    assert.equal('security' in controller, false);
  }
  assert.equal('sessions' in createController(getCurrentUserController), false);
  assert.equal(createController(getLogoutUserController).service.sessions, dependencies.sessions);
});

test('composição compartilha dataSource mas não sessões entre aplicações', () => {
  const dataSource = {};
  const first = composeDependencies(dataSource);
  const second = composeDependencies(dataSource);
  assert.equal(first.dataSource, dataSource);
  assert.equal(second.dataSource, dataSource);
  assert.equal('users' in first, false);
  assert.equal('products' in first, false);
  assert.notEqual(first.sessions, second.sessions);
  assert.equal('auth' in first, false);
  assert.equal('catalog' in first, false);
});

test('catálogo executa com repositório criado a partir do dataSource da composição', async () => {
  const expected = [{ id: '1', name: 'Cupcake' }];
  const dataSource = createTypeOrmFixture({ products: async () => expected });
  const controller = withDataSource(dataSource, () => getListProductsController());
  assert.deepEqual(await controller.service.execute(), expected);
});
