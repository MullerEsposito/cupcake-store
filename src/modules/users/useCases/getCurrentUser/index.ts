import { GetCurrentUserController } from './GetCurrentUserController.js';
import { GetCurrentUserService } from './GetCurrentUserService.js';
import { UsersRepository } from '#repositories/UsersRepository';

export function getCurrentUserController(): GetCurrentUserController {
  const usersRepository = new UsersRepository();
  const service = new GetCurrentUserService(usersRepository);
  return new GetCurrentUserController(service);
}
