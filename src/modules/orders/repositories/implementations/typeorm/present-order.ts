import type { EntityManager } from 'typeorm';
import type { OrderDTO } from '../../../contracts/OrderContracts.js';
import type { Order } from '../../../entities/Order.js';
import { OrderItem } from '../../../entities/OrderItem.js';
import { Payment } from '../../../entities/Payment.js';
import { OrderCancellation } from '../../../entities/OrderCancellation.js';
import { cents, money } from '../../../../cart/entities/cart-summary.js';

export async function presentOrder(manager: EntityManager, order: Order): Promise<OrderDTO> {
  const items = await manager.find(OrderItem, { where: { orderId: order.id }, order: { productId: 'ASC' } });
  const payments = await manager.find(Payment, { where: { orderId: order.id }, order: { id: 'DESC' } });
  const cancellation = await manager.findOneBy(OrderCancellation, { orderId: order.id });
  return { id: order.id, number: order.number, status: order.status, createdAt: order.createdAt.toISOString(),
    subtotal: order.subtotal, shipping: order.shipping, total: order.total,
    address: { recipient: order.recipient, postalCode: order.postalCode, street: order.street, number: order.addressNumber,
      complement: order.complement, district: order.district, city: order.city, state: order.state },
    items: items.map(item => ({ productId: item.productId, name: item.name, quantity: item.quantity,
      unitPrice: item.unitPrice, lineTotal: money(cents(item.unitPrice) * BigInt(item.quantity)) })),
    cancellation: cancellation ? { id: cancellation.id, actorId: cancellation.actorId, actorRole: cancellation.actorRole,
      previousStatus: cancellation.previousStatus, reason: cancellation.reason, createdAt: cancellation.createdAt.toISOString(),
      paymentId: cancellation.paymentId, refundStatus: cancellation.refundStatus, refundAmount: cancellation.refundAmount,
      refundedAt: cancellation.refundedAt?.toISOString() ?? null, stockRestored: cancellation.stockRestored, simulated: cancellation.simulated } : null,
    payments: payments.map(payment => ({ id: payment.id, method: payment.method, status: payment.status, amount: payment.amount,
      simulated: payment.simulated, idempotencyKey: payment.idempotencyKey, reason: payment.reason })) };
}
