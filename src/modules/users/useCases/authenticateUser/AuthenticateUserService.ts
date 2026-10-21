import type { IUsersRepository } from '#repositories/IUsersRepository';
import type { PublicUserDTO } from '#dtos/PublicUserDTO';
import type { IPasswordHasher, ISessions, Clock } from '#shared/contracts/ISecurity';
import { ApplicationError } from '#shared/errors/ApplicationError';
import { validateCredentials } from '#entities/credentials';
import { presentUser } from '#dtos/PublicUserDTO';
import { isBlocked, failedLoginState } from '#entities/login-policy';

import type { AuthenticationResult } from '../../contracts/AuthenticationResult.js';

const invalidCredentials = () => new ApplicationError('UNAUTHORIZED', 'E-mail ou senha inválidos.');
const blockedAccount = () => new ApplicationError('RATE_LIMIT', 'Acesso temporariamente bloqueado. Tente novamente em 15 minutos.');

type LoginOutcome = { user: PublicUserDTO; error?: never } | { error: ApplicationError; user?: never };

export class AuthenticateUserService {
  constructor(
    private readonly usersRepository: IUsersRepository,
    private readonly passwords: IPasswordHasher,
    private readonly sessions: ISessions,
    private readonly clock: Clock = Date.now
  ) {}

  async execute(input: unknown, previousToken?: string): Promise<AuthenticationResult> {
    const { email, password } = validateCredentials(input);
    const outcome = await this.usersRepository.withLockedUser<LoginOutcome>(email, async (user, saveLoginState) => {
      if (!user || !user.active) {
        await this.passwords.verify(password, null);
        return { error: invalidCredentials() };
      }
      const now = this.clock();
      if (isBlocked(user, now)) return { error: blockedAccount() };
      if (!await this.passwords.verify(password, user.passwordHash)) {
        const state = failedLoginState(user, now);
        await saveLoginState(user.id, state);
        return { error: state.blockedUntil ? blockedAccount() : invalidCredentials() };
      }
      await saveLoginState(user.id, { failedAttempts: 0, blockedUntil: null });
      return { user: presentUser(user) };
    });
    if (outcome.error) throw outcome.error;
    const token = await this.sessions.create(outcome.user.id);
    await this.sessions.delete(previousToken);
    return { user: outcome.user, token };
  }

}
