import type { IInventoryRepository } from '../../repositories/IInventoryRepository.js';
import type { IUsersRepository } from '#repositories/IUsersRepository';
import { requireAdministrator } from '../../../users/validators/requireAdministrator.js';
import { validateInventoryFilter } from '../../validators/validateInventoryFilter.js';

export class ListStockMovementsService {
  constructor(private readonly repository: IInventoryRepository, private readonly users: IUsersRepository) {}

  async execute(userId: string | null | undefined, input: unknown) {
    userId = await requireAdministrator(userId, this.users);
    return this.repository.list(userId, validateInventoryFilter(input));
  }
}
