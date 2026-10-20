import type { IOrdersRepository } from '../../repositories/IOrdersRepository.js';
import type { IUsersRepository } from '#repositories/IUsersRepository';
import { requireActiveUser } from '../../../users/validators/requireActiveUser.js';
import { validateCheckout } from '../../validators/validateCheckout.js';

export class CheckoutService {
  constructor(private readonly repository: IOrdersRepository, private readonly users: IUsersRepository) {}

  async execute(userId: string | null | undefined, input: unknown) {
    userId = await requireActiveUser(userId, this.users);
    return this.repository.checkout(userId, validateCheckout(input));
  }
}
