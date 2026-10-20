import { OrdersRepository } from '../../../orders/repositories/implementations/typeorm/OrdersRepository.js';
import { UsersRepository } from '#repositories/UsersRepository';
import { AdminCancelOrderController } from './AdminCancelOrderController.js';
import { AdminCancelOrderService } from './AdminCancelOrderService.js';

export function getAdminCancelOrderController(): AdminCancelOrderController {
  const repository = new OrdersRepository();
  const users = new UsersRepository();
  const service = new AdminCancelOrderService(repository, users);
  return new AdminCancelOrderController(service);
}
