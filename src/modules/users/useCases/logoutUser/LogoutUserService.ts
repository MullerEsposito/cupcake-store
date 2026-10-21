import type { ISessions } from '#shared/contracts/ISecurity';

export class LogoutUserService {
  constructor(private readonly sessions: ISessions) {}

  async execute(token: string | undefined): Promise<void> {
    await this.sessions.delete(token);
  }
}
