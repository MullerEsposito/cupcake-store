import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { GetCartService } from './GetCartService.js';

export class GetCartController {
  constructor(private readonly service: GetCartService) {}

  async handle(request: ApiRequest, response: Response) {
    return response.json({ cart: await this.service.execute(request.cartAccess) });
  }
}
