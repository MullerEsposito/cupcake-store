import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { SaveProductService } from './SaveProductService.js';

export class SaveProductController {
  constructor(private readonly service: SaveProductService) {}

  async handle(request: ApiRequest, response: Response) {
    return response.json({ product: await this.service.execute(request.authentication?.userId, request.params.id, request.body) });
  }
}
