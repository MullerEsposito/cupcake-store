import { parseProductFilters } from '../../validators/parseProductFilters.js';
import type { IProductsRepository } from '#repositories/IProductsRepository';
import type { ProductDTO } from '#dtos/ProductDTO';

export class ListProductsService {
  constructor(private readonly productsRepository: IProductsRepository) {}

  async execute(input: unknown = {}): Promise<ProductDTO[]> {
    return this.productsRepository.listActive(parseProductFilters(input));
  }
}
