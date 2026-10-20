import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { ListProductsService } from './ListProductsService.js';

export class ListProductsController {
  constructor(private readonly listProductsService: ListProductsService) {}

  async handle(request: ApiRequest, response: Response): Promise<Response> {
    return response.json({ products: await this.listProductsService.execute() });
  }
}
