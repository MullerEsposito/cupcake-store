import type { CheckoutInput, PayOrderInput, OrderDTO } from '../contracts/OrderContracts.js';

export interface IOrdersRepository {
  list(userId: string): Promise<OrderDTO[]>;
  checkout(userId: string, input: CheckoutInput): Promise<OrderDTO>;
  pay(userId: string, orderId: string, input: PayOrderInput): Promise<OrderDTO>;
}
