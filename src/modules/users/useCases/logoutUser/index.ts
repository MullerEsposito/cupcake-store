import type { ControllerDependencies } from '#http/dependencies';
import { LogoutUserController } from './LogoutUserController.js';
import { LogoutUserService } from './LogoutUserService.js';

export function getLogoutUserController({ sessions, origin }: Pick<ControllerDependencies, 'sessions' | 'origin'>): LogoutUserController {
  const service = new LogoutUserService(sessions);
  return new LogoutUserController(service, origin);
}
