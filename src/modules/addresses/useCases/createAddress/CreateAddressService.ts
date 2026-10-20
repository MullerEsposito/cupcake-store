import type { IPostalCodeProvider } from '../../contracts/IPostalCodeProvider.js';
import { ApplicationError } from '#shared/errors/ApplicationError';
import type { IAddressesRepository } from '../../repositories/IAddressesRepository.js';
import type { IUsersRepository } from '#repositories/IUsersRepository';
import { requireActiveUser } from '../../../users/validators/requireActiveUser.js';
import { validateAddress } from '../../validators/validateAddress.js';

export class CreateAddressService {
  constructor(private readonly repository: IAddressesRepository, private readonly users: IUsersRepository, private readonly postalCodes: IPostalCodeProvider) {}

  async execute(userId: string | null | undefined, input: unknown) {
    userId = await requireActiveUser(userId, this.users);
    const address = validateAddress(input);
    const resolved = await this.postalCodes.lookup(address.postalCode);
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR');
    if (address.state !== resolved.state || normalize(address.city) !== normalize(resolved.city)) {
      throw new ApplicationError('VALIDATION', 'Cidade e UF devem corresponder ao CEP consultado.');
    }
    return this.repository.create(userId, { ...address, city: resolved.city, state: resolved.state });
  }
}
