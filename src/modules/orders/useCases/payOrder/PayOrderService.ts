import type { IOrdersRepository } from '../../repositories/IOrdersRepository.js';
import type { IUsersRepository } from '#repositories/IUsersRepository';
import { requireActiveUser } from '../../../users/validators/requireActiveUser.js';
import { validateOrderId, validatePayment } from '../../validators/validateCheckout.js';

export class PayOrderService {
  constructor(private readonly repository: IOrdersRepository, private readonly users: IUsersRepository) {}

  async execute(userId: string | null | undefined, orderId: unknown, input: unknown) {
    userId = await requireActiveUser(userId, this.users);
    return this.repository.pay(userId, validateOrderId(orderId), validatePayment(input));
  }
}
