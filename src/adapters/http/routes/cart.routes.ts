import { Router } from 'express';
import { resolveSession } from '../middlewares/resolve-session.js';
import { resolveCart } from '../middlewares/resolve-cart.js';
import { jsonBody } from '../helpers/request-body.js';
import { getDependencies } from '../contracts.js';
import type { HttpLocals } from '../contracts.js';
import { getCartController } from '#cart-usecases/getCart/index';
import { getChangeCartController } from '#cart-usecases/changeCart/index';
import { getMergeCartController } from '#cart-usecases/mergeCart/index';

export const cartRoutes = Router({ caseSensitive: true, strict: true });
cartRoutes.use(async (request, response, next) => {
  if (request.method !== 'GET') await (request.app.locals as HttpLocals).cartRateLimit(request);
  next();
}, resolveSession, resolveCart);
cartRoutes.get('/', (request, response) => getCartController().handle(request, response));
cartRoutes.post('/items', ...jsonBody(), (request, response) => getChangeCartController().handle(request, response, 'add'));
cartRoutes.post('/items/:id/quantity', ...jsonBody(), (request, response) => getChangeCartController().handle(request, response, 'set'));
cartRoutes.post('/items/:id/remove', ...jsonBody(), (request, response) => getChangeCartController().handle(request, response, 'remove'));
cartRoutes.post('/merge', ...jsonBody(), (request, response) => getMergeCartController(getDependencies(request).origin).handle(request, response));
