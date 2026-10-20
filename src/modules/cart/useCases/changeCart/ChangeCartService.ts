import type { ICartsRepository } from '../../repositories/ICartsRepository.js';
import type { IUsersRepository } from '#repositories/IUsersRepository';
import type { CartAccess, CartOperation } from '../../contracts/CartContracts.js';
import { validateCartAccess } from '../../validators/validateCartAccess.js';
import { ApplicationError } from '#shared/errors/ApplicationError';
import { MAX_QUANTITY } from '../../entities/cart-summary.js';

export class ChangeCartService {
  constructor(private readonly carts: ICartsRepository, private readonly users: IUsersRepository) {}

  async execute(access: CartAccess | undefined, operation: CartOperation, productId: unknown, quantity: unknown) {
    const context = await validateCartAccess(access, this.users);
    if (typeof productId !== 'string' || !/^[1-9][0-9]{0,17}$/.test(productId)) throw new ApplicationError('VALIDATION', 'Produto inválido.');
    if (operation !== 'remove' && (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY)) {
      throw new ApplicationError('VALIDATION', 'Informe uma quantidade inteira entre 1 e 99.');
    }
    return this.carts.change(context.owner, { operation, productId, quantity: operation === 'remove' ? 0 : quantity as number });
  }
}
