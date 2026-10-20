import type { ICartsRepository } from '../../repositories/ICartsRepository.js';
import type { IUsersRepository } from '#repositories/IUsersRepository';
import type { CartAccess } from '../../contracts/CartContracts.js';
import { validateCartAccess } from '../../validators/validateCartAccess.js';
import { ApplicationError } from '#shared/errors/ApplicationError';

export class MergeCartService {
  constructor(private readonly carts: ICartsRepository, private readonly users: IUsersRepository) {}

  async execute(input: CartAccess | undefined) {
    const access = await validateCartAccess(input, this.users);
    if (access.owner.kind !== 'user') throw new ApplicationError('UNAUTHORIZED', 'Entre na sua conta para incorporar o carrinho.');
    return this.carts.merge(access.owner.id, access.guestHash);
  }
}
