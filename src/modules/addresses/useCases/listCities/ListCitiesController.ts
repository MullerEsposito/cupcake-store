import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { ListCitiesService } from './ListCitiesService.js';

export class ListCitiesController {
  constructor(private readonly service: ListCitiesService) {}

  async handle(request: ApiRequest, response: Response) {
    return response.json({ cities: await this.service.execute(request.authentication?.userId, request.params.state) });
  }
}
