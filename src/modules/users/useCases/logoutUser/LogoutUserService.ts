import type { ISessions } from '#shared/contracts/ISecurity';

export class LogoutUserService {
  constructor(private readonly sessions: ISessions) {}

  execute(token: string | undefined): void {
    this.sessions.delete(token);
  }
}
