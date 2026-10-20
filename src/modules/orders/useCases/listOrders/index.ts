import { OrdersRepository } from '../../repositories/implementations/typeorm/OrdersRepository.js';
import { UsersRepository } from '#repositories/UsersRepository';
import { ListOrdersController } from './ListOrdersController.js';
import { ListOrdersService } from './ListOrdersService.js';

export function getListOrdersController(): ListOrdersController {
  const repository = new OrdersRepository();
  const users = new UsersRepository();
  const service = new ListOrdersService(repository, users);
  return new ListOrdersController(service);
}
