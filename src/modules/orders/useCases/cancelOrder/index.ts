import { OrdersRepository } from '../../../orders/repositories/implementations/typeorm/OrdersRepository.js';
import { UsersRepository } from '#repositories/UsersRepository';
import { CancelOrderController } from './CancelOrderController.js';
import { CancelOrderService } from './CancelOrderService.js';

export function getCancelOrderController(): CancelOrderController {
  const repository = new OrdersRepository();
  const users = new UsersRepository();
  const service = new CancelOrderService(repository, users);
  return new CancelOrderController(service);
}
