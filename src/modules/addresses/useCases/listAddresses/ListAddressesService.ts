import type { IAddressesRepository } from '../../repositories/IAddressesRepository.js';
import type { IUsersRepository } from '#repositories/IUsersRepository';
import { requireActiveUser } from '../../../users/validators/requireActiveUser.js';

export class ListAddressesService {
  constructor(private readonly repository: IAddressesRepository, private readonly users: IUsersRepository) {}

  async execute(userId: string | null | undefined) {
    userId = await requireActiveUser(userId, this.users);
    return this.repository.list(userId);
  }
}
