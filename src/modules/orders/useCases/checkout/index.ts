import { OrdersRepository } from '../../repositories/implementations/typeorm/OrdersRepository.js';
import { UsersRepository } from '#repositories/UsersRepository';
import { CheckoutController } from './CheckoutController.js';
import { CheckoutService } from './CheckoutService.js';

export function getCheckoutController(): CheckoutController {
  const repository = new OrdersRepository();
  const users = new UsersRepository();
  const service = new CheckoutService(repository, users);
  return new CheckoutController(service);
}
