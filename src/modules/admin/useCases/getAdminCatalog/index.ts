import { AdministrationRepository } from '../../repositories/implementations/typeorm/AdministrationRepository.js';
import { UsersRepository } from '#repositories/UsersRepository';
import { GetAdminCatalogController } from './GetAdminCatalogController.js';
import { GetAdminCatalogService } from './GetAdminCatalogService.js';

export function getAdminCatalogController(): GetAdminCatalogController {
  const repository = new AdministrationRepository();
  const users = new UsersRepository();
  const service = new GetAdminCatalogService(repository, users);
  return new GetAdminCatalogController(service);
}
