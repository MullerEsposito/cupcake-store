import type { CheckoutInput, PayOrderInput, OrderDTO } from '../contracts/OrderContracts.js';
import type { CancellationInput } from '../contracts/CancellationContracts.js';

export interface IOrdersRepository {
  list(userId: string): Promise<OrderDTO[]>;
  find(userId: string, id: string): Promise<OrderDTO>;
  checkout(userId: string, input: CheckoutInput): Promise<OrderDTO>;
  pay(userId: string, orderId: string, input: PayOrderInput): Promise<OrderDTO>;
  cancel(userId: string, orderId: string, input: CancellationInput): Promise<OrderDTO>;
  cancelAsAdministrator(userId: string, orderId: string, input: CancellationInput): Promise<OrderDTO>;
}
