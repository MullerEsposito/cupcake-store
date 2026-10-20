import type { EntityManager, Repository } from 'typeorm';
import { IsNull } from 'typeorm';
import { getRepository } from '#infrastructure/typeorm/repository-context';
import { Product } from '#entities/Product';
import { ApplicationError } from '#shared/errors/ApplicationError';
import { Cart } from '../../../entities/Cart.js';
import { CartItem } from '../../../entities/CartItem.js';
import { cents, money, summarize, MAX_QUANTITY, MAX_CART_ITEMS } from '../../../entities/cart-summary.js';
import type { ICartsRepository } from '../../ICartsRepository.js';
import type { CartChange, CartDTO, CartOwner } from '../../../contracts/CartContracts.js';

export class CartsRepository implements ICartsRepository {
  private readonly repository: Repository<Cart>;

  constructor() { this.repository = getRepository(Cart); }

  private async lock(manager: EntityManager, owners: CartOwner[]): Promise<void> {
    const keys = [...new Set(owners.map(owner => `cart:${owner.kind}:${owner.id}`))].sort();
    for (const key of keys) await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [key]);
  }

  private find(manager: EntityManager, owner: CartOwner): Promise<Cart | null> {
    return manager.getRepository(Cart).findOneBy(owner.kind === 'user'
      ? { state: 'ATIVO', userId: owner.id }
      : { state: 'ATIVO', userId: IsNull(), guestHash: owner.id });
  }

  private async ensure(manager: EntityManager, owner: CartOwner): Promise<Cart> {
    const existing = await this.find(manager, owner);
    if (existing) return existing;
    const carts = manager.getRepository(Cart);
    return carts.save(carts.create({ state: 'ATIVO', userId: owner.kind === 'user' ? owner.id : null,
      guestHash: owner.kind === 'guest' ? owner.id : null }));
  }

  private async snapshot(manager: EntityManager, cart: Cart | null, warnings: string[] = []): Promise<CartDTO> {
    if (!cart) return summarize([], warnings);
    const rows = await manager.getRepository(CartItem).find({ where: { cartId: cart.id }, relations: { product: true }, order: { id: 'ASC' } });
    return summarize(rows.map(row => ({ productId: row.productId, name: row.product.name, quantity: row.quantity,
      unitPrice: row.product.price, lineTotal: money(cents(row.product.price) * BigInt(row.quantity)),
      stock: row.product.stock, available: row.product.active && row.product.stock >= row.quantity })), warnings);
  }

  async get(owner: CartOwner): Promise<CartDTO> {
    return this.repository.manager.transaction(async manager => {
      await this.lock(manager, [owner]);
      return this.snapshot(manager, await this.find(manager, owner));
    });
  }

  async change(owner: CartOwner, change: CartChange): Promise<CartDTO> {
    return this.repository.manager.transaction(async manager => {
      await this.lock(manager, [owner]);
      const cart = change.operation === 'remove' ? await this.find(manager, owner) : await this.ensure(manager, owner);
      if (!cart) return summarize([]);
      const items = manager.getRepository(CartItem);
      const existing = await items.findOneBy({ cartId: cart.id, productId: change.productId });
      if (change.operation === 'remove') {
        if (existing) await items.delete(existing.id);
      } else {
        const product = await manager.getRepository(Product).findOne({ where: { id: change.productId, active: true }, lock: { mode: 'pessimistic_read' } });
        if (!product) throw new ApplicationError('NOT_FOUND', 'Produto indisponível.');
        const quantity = change.operation === 'add' ? (existing?.quantity ?? 0) + change.quantity : change.quantity;
        if (quantity > MAX_QUANTITY || quantity > product.stock) {
          throw new ApplicationError('CONFLICT', 'Quantidade acima do estoque disponível ou do limite de 99 unidades.');
        }
        if (!existing && await items.countBy({ cartId: cart.id }) >= MAX_CART_ITEMS) {
          throw new ApplicationError('CONFLICT', 'O carrinho permite até 100 produtos diferentes.');
        }
        await items.save(existing ? Object.assign(existing, { quantity }) : items.create({ cartId: cart.id, productId: product.id, quantity }));
      }
      await manager.getRepository(Cart).update(cart.id, { updatedAt: new Date() });
      return this.snapshot(manager, cart);
    });
  }

  async merge(userId: string, guestHash: string | null): Promise<CartDTO> {
    const owner: CartOwner = { kind: 'user', id: userId };
    return this.repository.manager.transaction(async manager => {
      await this.lock(manager, guestHash ? [owner, { kind: 'guest', id: guestHash }] : [owner]);
      const guest = guestHash ? await this.find(manager, { kind: 'guest', id: guestHash }) : null;
      if (!guest) return this.snapshot(manager, await this.find(manager, owner));
      const incoming = await manager.getRepository(CartItem).find({ where: { cartId: guest.id }, order: { productId: 'ASC' } });
      const cart = await this.ensure(manager, owner);
      const items = manager.getRepository(CartItem);
      const warnings: string[] = [];
      for (const row of incoming) {
        const product = await manager.getRepository(Product).findOne({ where: { id: row.productId }, lock: { mode: 'pessimistic_read' } });
        if (!product || !product.active || product.stock === 0) {
          warnings.push('Um produto indisponível do carrinho de visitante não foi incorporado.');
          continue;
        }
        const existing = await items.findOneBy({ cartId: cart.id, productId: row.productId });
        if (!existing && await items.countBy({ cartId: cart.id }) >= MAX_CART_ITEMS) {
          warnings.push('O limite de produtos do carrinho foi atingido.');
          continue;
        }
        const requested = (existing?.quantity ?? 0) + row.quantity;
        const quantity = Math.min(requested, product.stock, MAX_QUANTITY);
        if (quantity !== requested) warnings.push(`A quantidade de ${product.name} foi ajustada ao estoque e ao limite permitido.`);
        await items.save(existing ? Object.assign(existing, { quantity }) : items.create({ cartId: cart.id, productId: row.productId, quantity }));
      }
      await manager.getRepository(Cart).update(guest.id, { state: 'ABANDONADO' });
      await manager.getRepository(Cart).update(cart.id, { updatedAt: new Date() });
      return this.snapshot(manager, cart, warnings);
    });
  }
}
