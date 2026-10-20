import type { ControllerDependencies } from '#http/dependencies';
import { RegisterUserController } from './RegisterUserController.js';
import { RegisterUserService } from './RegisterUserService.js';
import { UsersRepository } from '#repositories/UsersRepository';

export function getRegisterUserController({ passwords, sessions, origin }: Pick<ControllerDependencies, 'passwords' | 'sessions' | 'origin'>): RegisterUserController {
  const usersRepository = new UsersRepository();
  const service = new RegisterUserService(usersRepository, passwords, sessions);
  return new RegisterUserController(service, origin);
}
