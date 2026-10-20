import type { IUsersRepository } from '#repositories/IUsersRepository';
import { ApplicationError } from '#shared/errors/ApplicationError';

export async function requireAdministrator(userId: string | null | undefined, users: IUsersRepository): Promise<string> {
  if (!userId) throw new ApplicationError('UNAUTHORIZED', 'Entre na sua conta para continuar.');
  const user = await users.findActiveById(userId);
  if (!user) throw new ApplicationError('UNAUTHORIZED', 'Entre novamente na sua conta.');
  if (user.role !== 'ADMIN') throw new ApplicationError('FORBIDDEN', 'Acesso exclusivo para administradores.');
  return userId;
}
