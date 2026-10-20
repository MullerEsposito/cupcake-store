import type { IOrdersRepository } from '../../repositories/IOrdersRepository.js';
import type { IUsersRepository } from '#repositories/IUsersRepository';
import { requireActiveUser } from '../../../users/validators/requireActiveUser.js';
import { validateOrderId } from '../../../orders/validators/validateCheckout.js';

export class GetOrderService {
  constructor(private readonly repository: IOrdersRepository, private readonly users: IUsersRepository) {}

  async execute(userId: string | null | undefined, id: unknown) {
    userId = await requireActiveUser(userId, this.users);
    return this.repository.find(userId, validateOrderId(id));
  }
}
