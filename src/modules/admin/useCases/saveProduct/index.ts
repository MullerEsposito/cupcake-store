import { AdministrationRepository } from '../../repositories/implementations/typeorm/AdministrationRepository.js';
import { UsersRepository } from '#repositories/UsersRepository';
import { SaveProductController } from './SaveProductController.js';
import { SaveProductService } from './SaveProductService.js';

export function getSaveProductController(): SaveProductController {
  const repository = new AdministrationRepository();
  const users = new UsersRepository();
  const service = new SaveProductService(repository, users);
  return new SaveProductController(service);
}
