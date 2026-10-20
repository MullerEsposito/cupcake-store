import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { AuthenticateUserService } from './AuthenticateUserService.js';
import { authenticatedResponse } from '#http/helpers/authenticated-response';

export class AuthenticateUserController {
  constructor(private readonly authenticateUserService: AuthenticateUserService, private readonly origin: string) {}

  async handle(request: ApiRequest, response: Response): Promise<Response> {
    const result = await this.authenticateUserService.execute(request.body, request.authentication?.token);
    return authenticatedResponse(response, result, this.origin, 200);
  }
}
