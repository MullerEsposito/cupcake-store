import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { RegisterUserService } from './RegisterUserService.js';
import { authenticatedResponse } from '#http/helpers/authenticated-response';

export class RegisterUserController {
  constructor(private readonly registerUserService: RegisterUserService, private readonly origin: string) {}

  async handle(request: ApiRequest, response: Response): Promise<Response> {
    const result = await this.registerUserService.execute(request.body, request.authentication?.token);
    return authenticatedResponse(response, result, this.origin, 201);
  }
}
