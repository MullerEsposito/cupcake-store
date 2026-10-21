import { getLookupPostalCodeController } from '../../../modules/addresses/useCases/lookupPostalCode/index.js';
import { getListCitiesController } from '../../../modules/addresses/useCases/listCities/index.js';
import { Router } from 'express';
import { resolveSession } from '../middlewares/resolve-session.js';
import { requireSession } from '../middlewares/require-session.js';
import { jsonBody } from '../helpers/request-body.js';
import type { HttpLocals } from '../contracts.js';
import { getListAddressesController } from '../../../modules/addresses/useCases/listAddresses/index.js';
import { getCreateAddressController } from '../../../modules/addresses/useCases/createAddress/index.js';

export const addressesRoutes = Router({ caseSensitive: true, strict: true });
addressesRoutes.use(resolveSession, requireSession);
addressesRoutes.use(async (request, response, next) => {
  if (request.method !== 'GET') await (request.app.locals as HttpLocals).cartRateLimit(request);
  next();
});
addressesRoutes.get('/postal-codes/:postalCode', async (request, response) => {
  await (request.app.locals as HttpLocals).cartRateLimit(request);
  return getLookupPostalCodeController().handle(request, response);
});
addressesRoutes.get('/states/:state/cities', async (request, response) => {
  await (request.app.locals as HttpLocals).cartRateLimit(request);
  return getListCitiesController().handle(request, response);
});
addressesRoutes.get('/', (request, response) => getListAddressesController().handle(request, response));
addressesRoutes.post('/', ...jsonBody(), (request, response) => getCreateAddressController().handle(request, response));
