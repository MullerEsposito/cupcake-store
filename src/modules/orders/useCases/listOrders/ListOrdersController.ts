import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { ListOrdersService } from './ListOrdersService.js';

export class ListOrdersController {
  constructor(private readonly service: ListOrdersService) {}

  async handle(request: ApiRequest, response: Response) {
    return response.json({ orders: await this.service.execute(request.authentication?.userId) });
  }
}
