import { CartsRepository } from '#repositories/CartsRepository';
import { UsersRepository } from '#repositories/UsersRepository';
import { ChangeCartController } from './ChangeCartController.js';
import { ChangeCartService } from './ChangeCartService.js';

export function getChangeCartController(): ChangeCartController {
  const carts = new CartsRepository();
  const users = new UsersRepository();
  const service = new ChangeCartService(carts, users);
  return new ChangeCartController(service);
}
