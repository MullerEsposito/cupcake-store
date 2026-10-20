import type { CartAccess } from '../contracts/CartContracts.js';
import type { IUsersRepository } from '#repositories/IUsersRepository';
import { ApplicationError } from '#shared/errors/ApplicationError';

export async function validateCartAccess(access: CartAccess | undefined, users: IUsersRepository): Promise<CartAccess> {
  if (!access) throw new ApplicationError('UNAUTHORIZED', 'Não foi possível identificar o carrinho.');
  if (access.owner.kind === 'user' && !await users.findActiveById(access.owner.id)) {
    throw new ApplicationError('UNAUTHORIZED', 'Entre novamente para acessar seu carrinho.');
  }
  return access;
}
