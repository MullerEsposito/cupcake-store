import { OrdersRepository } from '../../repositories/implementations/typeorm/OrdersRepository.js';
import { UsersRepository } from '#repositories/UsersRepository';
import { GetOrderController } from './GetOrderController.js';
import { GetOrderService } from './GetOrderService.js';

export function getOrderController(): GetOrderController {
  const repository = new OrdersRepository();
  const users = new UsersRepository();
  const service = new GetOrderService(repository, users);
  return new GetOrderController(service);
}
