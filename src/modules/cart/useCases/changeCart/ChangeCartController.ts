import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { ChangeCartService } from './ChangeCartService.js';
import type { CartOperation } from '../../contracts/CartContracts.js';

export class ChangeCartController {
  constructor(private readonly service: ChangeCartService) {}

  async handle(request: ApiRequest, response: Response, operation: CartOperation) {
    const body = request.body as Record<string, unknown>;
    const productId = operation === 'add' ? body.productId : request.params.id;
    return response.json({ cart: await this.service.execute(request.cartAccess, operation, productId, body.quantity) });
  }
}
