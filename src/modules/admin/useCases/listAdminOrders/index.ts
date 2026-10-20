import { AdministrationRepository } from '../../repositories/implementations/typeorm/AdministrationRepository.js';
import { UsersRepository } from '#repositories/UsersRepository';
import { ListAdminOrdersController } from './ListAdminOrdersController.js';
import { ListAdminOrdersService } from './ListAdminOrdersService.js';

export function getListAdminOrdersController(): ListAdminOrdersController {
  const repository = new AdministrationRepository();
  const users = new UsersRepository();
  const service = new ListAdminOrdersService(repository, users);
  return new ListAdminOrdersController(service);
}
