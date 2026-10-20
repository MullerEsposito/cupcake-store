import { CartsRepository } from '#repositories/CartsRepository';
import { UsersRepository } from '#repositories/UsersRepository';
import { GetCartController } from './GetCartController.js';
import { GetCartService } from './GetCartService.js';

export function getCartController(): GetCartController {
  const carts = new CartsRepository();
  const users = new UsersRepository();
  const service = new GetCartService(carts, users);
  return new GetCartController(service);
}
