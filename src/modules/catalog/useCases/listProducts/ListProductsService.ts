import type { IProductsRepository } from '#repositories/IProductsRepository';
import type { ProductDTO } from '#dtos/ProductDTO';

export class ListProductsService {
  constructor(private readonly productsRepository: IProductsRepository) {}

  execute(): Promise<ProductDTO[]> {
    return this.productsRepository.listActive();
  }
}
