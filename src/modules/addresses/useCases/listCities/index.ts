import { IbgeCitiesProvider } from '../../../../infrastructure/postal-code/IbgeCitiesProvider.js';
import { UsersRepository } from '#repositories/UsersRepository';
import { ListCitiesController } from './ListCitiesController.js';
import { ListCitiesService } from './ListCitiesService.js';

export function getListCitiesController(): ListCitiesController {
  const users = new UsersRepository();
  const provider = new IbgeCitiesProvider();
  const service = new ListCitiesService(provider, users);
  return new ListCitiesController(service);
}
