import type { ControllerDependencies } from '#http/dependencies';
import { AuthenticateUserController } from './AuthenticateUserController.js';
import { AuthenticateUserService } from './AuthenticateUserService.js';
import { UsersRepository } from '#repositories/UsersRepository';

export function getAuthenticateUserController({ passwords, sessions, origin, clock }: Pick<ControllerDependencies, 'passwords' | 'sessions' | 'origin' | 'clock'>): AuthenticateUserController {
  const usersRepository = new UsersRepository();
  const service = new AuthenticateUserService(usersRepository, passwords, sessions, clock);
  return new AuthenticateUserController(service, origin);
}
