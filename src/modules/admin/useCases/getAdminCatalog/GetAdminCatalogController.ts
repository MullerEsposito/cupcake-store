import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { GetAdminCatalogService } from './GetAdminCatalogService.js';

export class GetAdminCatalogController {
  constructor(private readonly service: GetAdminCatalogService) {}

  async handle(request: ApiRequest, response: Response) {
    return response.json({ catalog: await this.service.execute(request.authentication?.userId, request.query) });
  }
}
