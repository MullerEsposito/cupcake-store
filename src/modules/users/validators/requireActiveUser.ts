import type { IUsersRepository } from '#repositories/IUsersRepository';
import { ApplicationError } from '#shared/errors/ApplicationError';

export async function requireActiveUser(userId: string | null | undefined, users: IUsersRepository): Promise<string> {
  if (!userId || !await users.findActiveById(userId)) {
    throw new ApplicationError('UNAUTHORIZED', 'Entre na sua conta para continuar.');
  }
  return userId;
}
