import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { ListAddressesService } from './ListAddressesService.js';

export class ListAddressesController {
  constructor(private readonly service: ListAddressesService) {}

  async handle(request: ApiRequest, response: Response) {
    return response.json({ addresses: await this.service.execute(request.authentication?.userId) });
  }
}
