import type { ICartsRepository } from '../../repositories/ICartsRepository.js';
import type { IUsersRepository } from '#repositories/IUsersRepository';
import type { CartAccess } from '../../contracts/CartContracts.js';
import { validateCartAccess } from '../../validators/validateCartAccess.js';

export class GetCartService {
  constructor(private readonly carts: ICartsRepository, private readonly users: IUsersRepository) {}

  async execute(input: CartAccess | undefined) {
    const access = await validateCartAccess(input, this.users);
    return this.carts.get(access.owner);
  }
}
