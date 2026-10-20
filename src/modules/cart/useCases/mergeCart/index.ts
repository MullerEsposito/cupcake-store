import { CartsRepository } from '#repositories/CartsRepository';
import { UsersRepository } from '#repositories/UsersRepository';
import { MergeCartController } from './MergeCartController.js';
import { MergeCartService } from './MergeCartService.js';

export function getMergeCartController(origin: string): MergeCartController {
  const carts = new CartsRepository();
  const users = new UsersRepository();
  const service = new MergeCartService(carts, users);
  return new MergeCartController(service, origin);
}
