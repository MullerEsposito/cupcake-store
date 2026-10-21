import { Router } from 'express';
import { resolveSession } from '../middlewares/resolve-session.js';
import { requireSession } from '../middlewares/require-session.js';
import type { HttpLocals } from '../contracts.js';
import { jsonBody } from '../helpers/request-body.js';
import { getAdminCatalogController } from '../../../modules/admin/useCases/getAdminCatalog/index.js';
import { getSaveProductController } from '../../../modules/admin/useCases/saveProduct/index.js';
import { getSaveCategoryController } from '../../../modules/admin/useCases/saveCategory/index.js';
import { getAdjustStockController } from '../../../modules/admin/useCases/adjustStock/index.js';
import { getListAdminOrdersController } from '../../../modules/admin/useCases/listAdminOrders/index.js';
import { getAdvanceOrderController } from '../../../modules/admin/useCases/advanceOrder/index.js';
import { getAdminCancelOrderController } from '../../../modules/admin/useCases/adminCancelOrder/index.js';

import { getListStockMovementsController } from '../../../modules/inventory/useCases/listStockMovements/index.js';

export const adminRoutes = Router({ caseSensitive: true, strict: true });
adminRoutes.use(resolveSession, requireSession);
adminRoutes.use(async (request, response, next) => {
  if (request.method !== 'GET') await (request.app.locals as HttpLocals).cartRateLimit(request);
  next();
});
adminRoutes.get('/catalog', (request, response) => getAdminCatalogController().handle(request, response));
adminRoutes.post('/products', ...jsonBody(), (request, response) => getSaveProductController().handle(request, response));
adminRoutes.post('/products/:id', ...jsonBody(), (request, response) => getSaveProductController().handle(request, response));
adminRoutes.post('/products/:id/stock', ...jsonBody(), (request, response) => getAdjustStockController().handle(request, response));
adminRoutes.post('/categories', ...jsonBody(), (request, response) => getSaveCategoryController().handle(request, response));
adminRoutes.post('/categories/:id', ...jsonBody(), (request, response) => getSaveCategoryController().handle(request, response));
adminRoutes.get('/orders', (request, response) => getListAdminOrdersController().handle(request, response));
adminRoutes.post('/orders/:id/status', ...jsonBody(), (request, response) => getAdvanceOrderController().handle(request, response));
adminRoutes.post('/orders/:id/cancel', ...jsonBody(), (request, response) => getAdminCancelOrderController().handle(request, response));

adminRoutes.get('/stock-movements', (request, response) => getListStockMovementsController().handle(request, response));
