import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { AdvanceOrderService } from './AdvanceOrderService.js';

export class AdvanceOrderController {
  constructor(private readonly service: AdvanceOrderService) {}

  async handle(request: ApiRequest, response: Response) {
    return response.json({ order: await this.service.execute(request.authentication?.userId, request.params.id, request.body) });
  }
}
