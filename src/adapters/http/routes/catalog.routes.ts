import { Router } from 'express';
import { getListProductsController } from '#catalog-usecases/listProducts/index';
import { getProductController } from '#catalog-usecases/getProduct/index';

export const catalogRoutes = Router({ caseSensitive: true, strict: true });

catalogRoutes.get('/', (request, response) => getListProductsController().handle(request, response));
catalogRoutes.get('/:id', (request, response) => getProductController().handle(request, response));
