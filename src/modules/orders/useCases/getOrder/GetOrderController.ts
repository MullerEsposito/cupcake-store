import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { GetOrderService } from './GetOrderService.js';

export class GetOrderController {
  constructor(private readonly service: GetOrderService) {}

  async handle(request: ApiRequest, response: Response) {
    return response.json({ order: await this.service.execute(request.authentication?.userId, request.params.id) });
  }
}
