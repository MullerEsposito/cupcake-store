import type { IOrdersRepository } from '../../../orders/repositories/IOrdersRepository.js';
import type { IUsersRepository } from '#repositories/IUsersRepository';
import { requireActiveUser } from '../../../users/validators/requireActiveUser.js';
import { validateOrderId } from '../../../orders/validators/validateCheckout.js';
import { validateCancellation } from '../../../orders/validators/validateCancellation.js';

export class CancelOrderService {
  constructor(private readonly repository: IOrdersRepository, private readonly users: IUsersRepository) {}

  async execute(userId: string | null | undefined, id: unknown, input: unknown) {
    userId = await requireActiveUser(userId, this.users);
    return this.repository.cancel(userId, validateOrderId(id), validateCancellation(input));
  }
}
