import { Cart } from '#entities/Cart';
import { CartItem } from '#entities/CartItem';
import test from 'node:test';
import assert from 'node:assert/strict';
import { User } from '../src/modules/users/entities/User.ts';
import { Product } from '../src/modules/catalog/entities/Product.ts';
import { Category } from '../src/modules/catalog/entities/Category.ts';
import { presentUser } from '../src/modules/users/dtos/PublicUserDTO.ts';
import { createDataSource } from '../src/infrastructure/typeorm/data-source.ts';

test('projeção pública de User nunca serializa hash ou estado de autenticação', () => {
  const user = Object.assign(new User(), {
    id: '1', name: 'Cliente', email: 'cliente@example.com', role: 'CLIENTE',
    passwordHash: 'hash-privado', active: true, failedAttempts: 3,
    blockedUntil: new Date(), extra: 'interno'
  });
  const output = presentUser(user);
  assert.deepEqual(output, { id: '1', name: 'Cliente', email: 'cliente@example.com', role: 'CLIENTE' });
  assert.equal(JSON.stringify(output).includes('hash-privado'), false);
});

test('DataSource registra somente as entidades únicas dos módulos', async () => {
  const source = createDataSource();
  await source.buildMetadatas();
  assert.deepEqual(source.options.entities, [User, Product, Category, Cart, CartItem]);
  assert.equal(source.entityMetadatas.length, 5);
  assert.equal(source.getRepository(User).target, User);
  assert.equal(source.getRepository(Product).target, Product);
  assert.equal(source.getMetadata(Product).relations[0].inverseEntityMetadata.target, Category);
});
