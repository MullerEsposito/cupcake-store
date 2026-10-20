import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { GetProductService } from './GetProductService.js';

export class GetProductController {
  constructor(private readonly getProductService: GetProductService) {}

  async handle(request: ApiRequest, response: Response): Promise<Response> {
    return response.json({ product: await this.getProductService.execute(request.params.id) });
  }
}
