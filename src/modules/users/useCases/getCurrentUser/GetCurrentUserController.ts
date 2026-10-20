import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { GetCurrentUserService } from './GetCurrentUserService.js';

export class GetCurrentUserController {
  constructor(private readonly getCurrentUserService: GetCurrentUserService) {}

  async handle(request: ApiRequest, response: Response): Promise<Response> {
    const id = request.authentication?.userId ?? null;
    return response.json({ user: await this.getCurrentUserService.execute(id) });
  }
}
