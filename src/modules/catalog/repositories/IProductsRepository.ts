import type { ProductDTO } from '#dtos/ProductDTO';

export interface IProductsRepository {
  listActive(): Promise<ProductDTO[]>;
  findActiveById(id: string): Promise<ProductDTO | null>;
}
