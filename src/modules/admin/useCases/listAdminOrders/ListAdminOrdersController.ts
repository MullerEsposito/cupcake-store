import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { ListAdminOrdersService } from './ListAdminOrdersService.js';

export class ListAdminOrdersController {
  constructor(private readonly service: ListAdminOrdersService) {}

  async handle(request: ApiRequest, response: Response) {
    return response.json({ orders: await this.service.execute(request.authentication?.userId, request.query) });
  }
}
