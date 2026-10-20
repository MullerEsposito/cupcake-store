import { Router } from 'express';
import { resolveSession } from '../middlewares/resolve-session.js';
import { requireSession } from '../middlewares/require-session.js';
import type { HttpLocals } from '../contracts.js';
import { jsonBody } from '../helpers/request-body.js';
import { getListOrdersController } from '../../../modules/orders/useCases/listOrders/index.js';
import { getCheckoutController } from '../../../modules/orders/useCases/checkout/index.js';
import { getPayOrderController } from '../../../modules/orders/useCases/payOrder/index.js';

export const ordersRoutes = Router({ caseSensitive: true, strict: true });
ordersRoutes.use(resolveSession, requireSession);
ordersRoutes.use((request, response, next) => {
  if (request.method !== 'GET') (request.app.locals as HttpLocals).cartRateLimit(request);
  next();
});
ordersRoutes.get('/', (request, response) => getListOrdersController().handle(request, response));
ordersRoutes.post('/checkout', ...jsonBody(), (request, response) => getCheckoutController().handle(request, response));
ordersRoutes.post('/:id/payments', ...jsonBody(), (request, response) => getPayOrderController().handle(request, response));
