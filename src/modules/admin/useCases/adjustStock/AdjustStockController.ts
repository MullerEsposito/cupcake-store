import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { AdjustStockService } from './AdjustStockService.js';

export class AdjustStockController {
  constructor(private readonly service: AdjustStockService) {}

  async handle(request: ApiRequest, response: Response) {
    return response.json({ product: await this.service.execute(request.authentication?.userId, request.params.id, request.body) });
  }
}
