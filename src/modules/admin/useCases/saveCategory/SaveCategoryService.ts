import type { IAdministrationRepository } from '../../repositories/IAdministrationRepository.js';
import type { IUsersRepository } from '#repositories/IUsersRepository';
import { requireAdministrator } from '../../../users/validators/requireAdministrator.js';
import { validateCategoryWrite } from '../../validators/admin-input.js';
import { validateOrderId } from '../../../orders/validators/validateCheckout.js';

export class SaveCategoryService {
  constructor(private readonly repository: IAdministrationRepository, private readonly users: IUsersRepository) {}

  async execute(userId: string | null | undefined, id: unknown, input: unknown) {
    userId = await requireAdministrator(userId, this.users);
    return this.repository.saveCategory(userId, id === undefined ? undefined : validateOrderId(id), validateCategoryWrite(input, id !== undefined));
  }
}
