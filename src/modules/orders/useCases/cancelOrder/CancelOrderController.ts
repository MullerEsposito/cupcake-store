import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { CancelOrderService } from './CancelOrderService.js';

export class CancelOrderController {
  constructor(private readonly service: CancelOrderService) {}

  async handle(request: ApiRequest, response: Response) {
    return response.json({ order: await this.service.execute(request.authentication?.userId, request.params.id, request.body) });
  }
}
