import type { IAdministrationRepository } from '../../repositories/IAdministrationRepository.js';
import type { IUsersRepository } from '#repositories/IUsersRepository';
import { requireAdministrator } from '../../../users/validators/requireAdministrator.js';
import { validateOrderFilter } from '../../validators/admin-input.js';

export class ListAdminOrdersService {
  constructor(private readonly repository: IAdministrationRepository, private readonly users: IUsersRepository) {}

  async execute(userId: string | null | undefined, input: unknown) {
    userId = await requireAdministrator(userId, this.users);
    return this.repository.orders(userId, validateOrderFilter(input));
  }
}
