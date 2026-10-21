import { validateCredentials } from '#entities/credentials';
import { presentUser } from '#dtos/PublicUserDTO';
import type { AuthenticationResult } from '../../contracts/AuthenticationResult.js';
import type { IUsersRepository } from '#repositories/IUsersRepository';
import type { IPasswordHasher, ISessions } from '#shared/contracts/ISecurity';

export class RegisterUserService {
  constructor(private readonly usersRepository: IUsersRepository, private readonly passwords: IPasswordHasher, private readonly sessions: ISessions) {}

  async execute(input: unknown, previousToken?: string): Promise<AuthenticationResult> {
    const { email, password, name } = validateCredentials(input, { registration: true });
    const passwordHash = await this.passwords.hash(password);
    const user = presentUser(await this.usersRepository.createClient({ email, name, passwordHash }));
    const token = await this.sessions.create(user.id);
    await this.sessions.delete(previousToken);
    return { user, token };
  }
}
