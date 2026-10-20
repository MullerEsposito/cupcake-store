import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { ListStockMovementsService } from './ListStockMovementsService.js';

export class ListStockMovementsController {
  constructor(private readonly service: ListStockMovementsService) {}

  async handle(request: ApiRequest, response: Response) {
    return response.json({ movements: await this.service.execute(request.authentication?.userId, request.query) });
  }
}
