import { GetProductController } from './GetProductController.js';
import { GetProductService } from './GetProductService.js';
import { ProductsRepository } from '#repositories/ProductsRepository';

export function getProductController(): GetProductController {
  const productsRepository = new ProductsRepository();
  const service = new GetProductService(productsRepository);
  return new GetProductController(service);
}
