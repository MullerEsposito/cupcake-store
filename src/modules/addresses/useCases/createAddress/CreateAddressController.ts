import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { CreateAddressService } from './CreateAddressService.js';

export class CreateAddressController {
  constructor(private readonly service: CreateAddressService) {}

  async handle(request: ApiRequest, response: Response) {
    return response.status(201).json({ address: await this.service.execute(request.authentication?.userId, request.body) });
  }
}
