import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { LookupPostalCodeService } from './LookupPostalCodeService.js';

export class LookupPostalCodeController {
  constructor(private readonly service: LookupPostalCodeService) {}

  async handle(request: ApiRequest, response: Response) {
    return response.json({ address: await this.service.execute(request.authentication?.userId, request.params.postalCode) });
  }
}
