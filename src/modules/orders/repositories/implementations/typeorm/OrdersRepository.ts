import { randomUUID } from 'node:crypto';
import type { EntityManager, Repository } from 'typeorm';
import { Order } from '../../../entities/Order.js';
import { OrderItem } from '../../../entities/OrderItem.js';
import { Payment } from '../../../entities/Payment.js';
import { Address } from '../../../../addresses/entities/Address.js';
import { Cart } from '#entities/Cart';
import { CartItem } from '#entities/CartItem';
import { Product } from '#entities/Product';
import { User } from '#entities/User';
import { cents, money, MAX_CART_ITEMS, MAX_QUANTITY } from '../../../../cart/entities/cart-summary.js';
import { ApplicationError } from '#shared/errors/ApplicationError';
import { getRepository } from '#infrastructure/typeorm/repository-context';
import type { IOrdersRepository } from '../../IOrdersRepository.js';
import type { CheckoutInput, PayOrderInput, OrderDTO } from '../../../contracts/OrderContracts.js';

async function lock(manager: EntityManager, key: string): Promise<void> {
  await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [key]);
}

async function activeUser(manager: EntityManager, userId: string): Promise<void> {
  if (!await manager.findOne(User, { where: { id: userId, active: true }, lock: { mode: 'pessimistic_read' } })) {
    throw new ApplicationError('UNAUTHORIZED', 'Entre novamente na sua conta.');
  }
}

async function presentOrder(manager: EntityManager, order: Order): Promise<OrderDTO> {
  const items = await manager.find(OrderItem, { where: { orderId: order.id }, order: { productId: 'ASC' } });
  const payments = await manager.find(Payment, { where: { orderId: order.id }, order: { id: 'DESC' } });
  return { id: order.id, number: order.number, status: order.status, createdAt: order.createdAt.toISOString(),
    subtotal: order.subtotal, shipping: order.shipping, total: order.total,
    address: { recipient: order.recipient, postalCode: order.postalCode, street: order.street, number: order.addressNumber,
      complement: order.complement, district: order.district, city: order.city, state: order.state },
    items: items.map(item => ({ productId: item.productId, name: item.name, quantity: item.quantity,
      unitPrice: item.unitPrice, lineTotal: money(cents(item.unitPrice) * BigInt(item.quantity)) })),
    payments: payments.map(payment => ({ id: payment.id, method: payment.method, status: payment.status, amount: payment.amount,
      simulated: payment.simulated, idempotencyKey: payment.idempotencyKey, reason: payment.reason })) };
}

export class OrdersRepository implements IOrdersRepository {
  private readonly repository: Repository<Order>;

  constructor() { this.repository = getRepository(Order); }

  async list(userId: string): Promise<OrderDTO[]> {
    return this.repository.manager.transaction('REPEATABLE READ', async manager => {
      await activeUser(manager, userId);
      const orders = await manager.find(Order, { where: { userId }, order: { id: 'DESC' }, take: 50 });
      const result: OrderDTO[] = [];
      for (const order of orders) result.push(await presentOrder(manager, order));
      return result;
    });
  }

  async checkout(userId: string, input: CheckoutInput): Promise<OrderDTO> {
    return this.repository.manager.transaction(async manager => {
      await lock(manager, `payment:${input.idempotencyKey}`);
      await lock(manager, `cart:user:${userId}`);
      await activeUser(manager, userId);
      const previous = await manager.findOneBy(Payment, { idempotencyKey: input.idempotencyKey });
      if (previous) {
        const existing = await manager.findOneBy(Order, { id: previous.orderId, userId });
        if (!existing || existing.addressId !== input.addressId || previous.method !== input.method
          || cents(existing.subtotal) !== cents(input.expectedSubtotal)) {
          throw new ApplicationError('CONFLICT', 'Esta chave já foi utilizada em outra operação.');
        }
        return presentOrder(manager, existing);
      }
      const address = await manager.findOne(Address, { where: { id: input.addressId, userId, active: true }, lock: { mode: 'pessimistic_read' } });
      if (!address) throw new ApplicationError('NOT_FOUND', 'Endereço não encontrado na sua conta.');
      const cart = await manager.findOneBy(Cart, { userId, state: 'ATIVO' });
      const lines = cart ? await manager.find(CartItem, { where: { cartId: cart.id }, order: { productId: 'ASC' } }) : [];
      if (!cart || !lines.length) throw new ApplicationError('CONFLICT', 'O carrinho está vazio.');
      if (lines.length > MAX_CART_ITEMS) throw new ApplicationError('CONFLICT', 'Carrinho acima do limite permitido.');
      const snapshots: { productId: string; name: string; quantity: number; unitPrice: string }[] = [];
      let subtotal = 0n;
      for (const line of lines) {
        const product = await manager.findOne(Product, { where: { id: line.productId, active: true }, lock: { mode: 'pessimistic_read' } });
        if (!product || line.quantity < 1 || line.quantity > MAX_QUANTITY || product.stock < line.quantity) {
          throw new ApplicationError('CONFLICT', 'Um produto está indisponível. Atualize o carrinho.');
        }
        subtotal += cents(product.price) * BigInt(line.quantity);
        snapshots.push({ productId: product.id, name: product.name, quantity: line.quantity, unitPrice: product.price });
      }
      if (subtotal > 999999999999n) throw new ApplicationError('CONFLICT', 'O total ultrapassa o limite de um pedido.');
      if (subtotal !== cents(input.expectedSubtotal)) throw new ApplicationError('CONFLICT', 'Os preços mudaram. Atualize o carrinho antes de confirmar.');
      const order = await manager.save(Order, manager.create(Order, {
        number: `CC-${randomUUID()}`, userId, addressId: address.id, status: 'AGUARDANDO_PAGAMENTO',
        recipient: address.recipient, postalCode: address.postalCode, street: address.street, addressNumber: address.number,
        complement: address.complement, district: address.district, city: address.city, state: address.state,
        subtotal: money(subtotal), shipping: '0.00', total: money(subtotal)
      }));
      await manager.save(OrderItem, snapshots.map(item => manager.create(OrderItem, { ...item, orderId: order.id })));
      await manager.save(Payment, manager.create(Payment, { orderId: order.id, method: input.method, status: 'PENDENTE',
        amount: order.total, processedAt: null, idempotencyKey: input.idempotencyKey, simulated: true, reason: null }));
      cart.state = 'CONVERTIDO';
      await manager.save(Cart, cart);
      return presentOrder(manager, order);
    });
  }

  async pay(userId: string, orderId: string, input: PayOrderInput): Promise<OrderDTO> {
    return this.repository.manager.transaction(async manager => {
      await lock(manager, `payment:${input.idempotencyKey}`);
      const order = await manager.findOne(Order, { where: { id: orderId, userId }, lock: { mode: 'pessimistic_write' } });
      if (!order) throw new ApplicationError('NOT_FOUND', 'Pedido não encontrado na sua conta.');
      await activeUser(manager, userId);
      let payment = await manager.findOneBy(Payment, { idempotencyKey: input.idempotencyKey });
      if (payment && (payment.orderId !== order.id || payment.method !== input.method)) {
        throw new ApplicationError('CONFLICT', 'Esta chave já foi utilizada em outra operação.');
      }
      if (payment && payment.status !== 'PENDENTE') return presentOrder(manager, order);
      if (order.status !== 'AGUARDANDO_PAGAMENTO') {
        throw new ApplicationError('CONFLICT', 'Este pedido não aceita novos pagamentos.');
      }
      if (!payment) {
        if (await manager.existsBy(Payment, { orderId, status: 'PENDENTE' })) {
          throw new ApplicationError('CONFLICT', 'Conclua a tentativa pendente antes de iniciar outra.');
        }
        payment = manager.create(Payment, { orderId, method: input.method, amount: order.total,
          idempotencyKey: input.idempotencyKey, simulated: true, status: 'PENDENTE', processedAt: null, reason: null });
      }
      let outcome = input.outcome;
      let reason = input.outcome === 'APROVADO' ? 'Aprovação simulada. Nenhuma cobrança real.'
        : input.outcome === 'RECUSADO' ? 'Recusa simulada. Tente novamente.' : 'Falha simulada. Tente novamente.';
      if (outcome === 'APROVADO') {
        const items = await manager.find(OrderItem, { where: { orderId }, order: { productId: 'ASC' } });
        const products: { product: Product; quantity: number }[] = [];
        for (const item of items) {
          const product = await manager.findOne(Product, { where: { id: item.productId }, lock: { mode: 'pessimistic_write' } });
          if (!product || !product.active || product.stock < item.quantity) {
            outcome = 'FALHA';
            reason = 'Estoque indisponível. Nenhuma cobrança ou baixa de estoque realizada.';
          } else products.push({ product, quantity: item.quantity });
        }
        if (!items.length) throw new ApplicationError('CONFLICT', 'Pedido sem itens.');
        if (outcome === 'APROVADO') {
          for (const { product, quantity } of products) {
            await manager.update(Product, { id: product.id }, { stock: product.stock - quantity });
          }
          order.status = 'PAGAMENTO_APROVADO';
          await manager.save(Order, order);
        }
      }
      if (!payment.id) payment = await manager.save(Payment, payment);
      await manager.update(Payment, { id: payment.id }, {
        status: outcome, reason, processedAt: () => 'GREATEST(clock_timestamp(), criado_em)'
      });
      return presentOrder(manager, order);
    });
  }
}
