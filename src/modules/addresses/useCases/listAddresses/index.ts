import { AddressesRepository } from '../../repositories/implementations/typeorm/AddressesRepository.js';
import { UsersRepository } from '#repositories/UsersRepository';
import { ListAddressesController } from './ListAddressesController.js';
import { ListAddressesService } from './ListAddressesService.js';

export function getListAddressesController(): ListAddressesController {
  const repository = new AddressesRepository();
  const users = new UsersRepository();
  const service = new ListAddressesService(repository, users);
  return new ListAddressesController(service);
}
