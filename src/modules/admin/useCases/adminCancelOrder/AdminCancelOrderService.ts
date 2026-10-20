import type { IOrdersRepository } from '../../../orders/repositories/IOrdersRepository.js';
import type { IUsersRepository } from '#repositories/IUsersRepository';
import { requireAdministrator } from '../../../users/validators/requireAdministrator.js';
import { validateOrderId } from '../../../orders/validators/validateCheckout.js';
import { validateCancellation } from '../../../orders/validators/validateCancellation.js';

export class AdminCancelOrderService {
  constructor(private readonly repository: IOrdersRepository, private readonly users: IUsersRepository) {}

  async execute(userId: string | null | undefined, id: unknown, input: unknown) {
    userId = await requireAdministrator(userId, this.users);
    return this.repository.cancelAsAdministrator(userId, validateOrderId(id), validateCancellation(input));
  }
}
