import type { Response } from 'express';
import type { ApiRequest } from '#http/contracts';
import type { MergeCartService } from './MergeCartService.js';
import { cartCookie } from '#http/helpers/cart-cookie';

export class MergeCartController {
  constructor(private readonly service: MergeCartService, private readonly origin: string) {}

  async handle(request: ApiRequest, response: Response) {
    const cart = await this.service.execute(request.cartAccess);
    return response.append('Set-Cookie', cartCookie('', this.origin, true)).json({ cart });
  }
}
