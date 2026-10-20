import { OrdersRepository } from '../../repositories/implementations/typeorm/OrdersRepository.js';
import { UsersRepository } from '#repositories/UsersRepository';
import { PayOrderController } from './PayOrderController.js';
import { PayOrderService } from './PayOrderService.js';

export function getPayOrderController(): PayOrderController {
  const repository = new OrdersRepository();
  const users = new UsersRepository();
  const service = new PayOrderService(repository, users);
  return new PayOrderController(service);
}
