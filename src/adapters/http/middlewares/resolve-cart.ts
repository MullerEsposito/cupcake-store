import type { RequestHandler } from 'express';
import type { ApiRequest } from '../contracts.js';
import { getDependencies } from '../contracts.js';
import { readCartToken, createCartToken, cartTokenHash, cartCookie } from '../helpers/cart-cookie.js';

export const resolveCart: RequestHandler = (request: ApiRequest, response, next) => {
  let token = readCartToken(request);
  const userId = request.authentication?.userId;
  if (!userId && !token) {
    token = createCartToken();
    response.append('Set-Cookie', cartCookie(token, getDependencies(request).origin));
  }
  const guestHash = token ? cartTokenHash(token) : null;
  request.cartAccess = userId
    ? { owner: { kind: 'user', id: userId }, guestHash }
    : { owner: { kind: 'guest', id: guestHash! }, guestHash };
  next();
};
