import { announceOrderAfterResponse } from '#http/events/order-events';
import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { AdminCancelOrderService } from './AdminCancelOrderService.js';

export class AdminCancelOrderController {
  constructor(private readonly service: AdminCancelOrderService) {}

  async handle(request: ApiRequest, response: Response) {
    const order = await this.service.execute(request.authentication?.userId, request.params.id, request.body);
    await announceOrderAfterResponse(request, response, order.id);
    return response.json({ order });
  }
}
