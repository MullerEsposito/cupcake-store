import type { IAddressesRepository } from '../../repositories/IAddressesRepository.js';
import type { IUsersRepository } from '#repositories/IUsersRepository';
import { requireActiveUser } from '../../../users/validators/requireActiveUser.js';
import { validateAddress } from '../../validators/validateAddress.js';

export class CreateAddressService {
  constructor(private readonly repository: IAddressesRepository, private readonly users: IUsersRepository) {}

  async execute(userId: string | null | undefined, input: unknown) {
    userId = await requireActiveUser(userId, this.users);
    return this.repository.create(userId, validateAddress(input));
  }
}
