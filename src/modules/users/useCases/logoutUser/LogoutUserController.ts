import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { LogoutUserService } from './LogoutUserService.js';
import { sessionCookie } from '#http/helpers/session-cookie';

export class LogoutUserController {
  constructor(private readonly logoutUserService: LogoutUserService, private readonly origin: string) {}

  async handle(request: ApiRequest, response: Response): Promise<Response> {
    await this.logoutUserService.execute(request.authentication?.token);
    return response.set('Set-Cookie', sessionCookie('', this.origin, { clear: true }))
      .json({ message: 'Você saiu da sua conta.' });
  }
}
