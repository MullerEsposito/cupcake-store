import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { CheckoutService } from './CheckoutService.js';

export class CheckoutController {
  constructor(private readonly service: CheckoutService) {}

  async handle(request: ApiRequest, response: Response) {
    return response.json({ order: await this.service.execute(request.authentication?.userId, request.body) });
  }
}
