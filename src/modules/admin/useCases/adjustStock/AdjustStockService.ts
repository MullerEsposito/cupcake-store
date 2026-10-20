import type { IAdministrationRepository } from '../../repositories/IAdministrationRepository.js';
import type { IUsersRepository } from '#repositories/IUsersRepository';
import { requireAdministrator } from '../../../users/validators/requireAdministrator.js';
import { validateStockAdjustment } from '../../validators/admin-input.js';
import { validateOrderId } from '../../../orders/validators/validateCheckout.js';

export class AdjustStockService {
  constructor(private readonly repository: IAdministrationRepository, private readonly users: IUsersRepository) {}

  async execute(userId: string | null | undefined, id: unknown, input: unknown) {
    userId = await requireAdministrator(userId, this.users);
    return this.repository.adjustStock(userId, validateOrderId(id), validateStockAdjustment(input));
  }
}
