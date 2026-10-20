import { ViaCepProvider } from '../../../../infrastructure/postal-code/ViaCepProvider.js';
import { AddressesRepository } from '../../repositories/implementations/typeorm/AddressesRepository.js';
import { UsersRepository } from '#repositories/UsersRepository';
import { CreateAddressController } from './CreateAddressController.js';
import { CreateAddressService } from './CreateAddressService.js';

export function getCreateAddressController(): CreateAddressController {
  const repository = new AddressesRepository();
  const users = new UsersRepository();
  const service = new CreateAddressService(repository, users, new ViaCepProvider());
  return new CreateAddressController(service);
}
