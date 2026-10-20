import type { IAdministrationRepository } from '../../repositories/IAdministrationRepository.js';
import type { IUsersRepository } from '#repositories/IUsersRepository';
import { requireAdministrator } from '../../../users/validators/requireAdministrator.js';
import { validatePage } from '../../validators/admin-input.js';

export class GetAdminCatalogService {
  constructor(private readonly repository: IAdministrationRepository, private readonly users: IUsersRepository) {}

  async execute(userId: string | null | undefined, input: unknown) {
    userId = await requireAdministrator(userId, this.users);
    return this.repository.catalog(userId, validatePage(input));
  }
}
