import { AdministrationRepository } from '../../repositories/implementations/typeorm/AdministrationRepository.js';
import { UsersRepository } from '#repositories/UsersRepository';
import { SaveCategoryController } from './SaveCategoryController.js';
import { SaveCategoryService } from './SaveCategoryService.js';

export function getSaveCategoryController(): SaveCategoryController {
  const repository = new AdministrationRepository();
  const users = new UsersRepository();
  const service = new SaveCategoryService(repository, users);
  return new SaveCategoryController(service);
}
