import type { ProductFilters } from '../contracts/ProductFilters.js';
import type { ProductDTO } from '#dtos/ProductDTO';

export interface IProductsRepository {
  listActive(filters?: ProductFilters): Promise<ProductDTO[]>;
  findActiveById(id: string): Promise<ProductDTO | null>;
}
