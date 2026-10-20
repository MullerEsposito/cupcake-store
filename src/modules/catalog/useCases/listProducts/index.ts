import { ListProductsController } from './ListProductsController.js';
import { ListProductsService } from './ListProductsService.js';
import { ProductsRepository } from '#repositories/ProductsRepository';

export function getListProductsController(): ListProductsController {
  const productsRepository = new ProductsRepository();
  const listProductsService = new ListProductsService(productsRepository);
  return new ListProductsController(listProductsService);
}
