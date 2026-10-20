import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { SaveCategoryService } from './SaveCategoryService.js';

export class SaveCategoryController {
  constructor(private readonly service: SaveCategoryService) {}

  async handle(request: ApiRequest, response: Response) {
    return response.json({ category: await this.service.execute(request.authentication?.userId, request.params.id, request.body) });
  }
}
