import type { ProductFilters } from '../../../contracts/ProductFilters.js';
import { getRepository } from '#infrastructure/typeorm/repository-context';
import { Product } from '#entities/Product';
import type { Repository, SelectQueryBuilder } from 'typeorm';
import type { IProductsRepository } from '#repositories/IProductsRepository';
import type { ProductDTO } from '#dtos/ProductDTO';

export class ProductsRepository implements IProductsRepository {
  private readonly repository: Repository<Product>;

  constructor() {
    this.repository = getRepository(Product);
  }

  private query(): SelectQueryBuilder<Product> {
    return this.repository.createQueryBuilder('product')
      .innerJoin('product.category', 'category')
      .select('product.id', 'id')
      .addSelect('product.name', 'name')
      .addSelect('product.description', 'description')
      .addSelect('product.price', 'price')
      .addSelect('product.weight', 'weight')
      .addSelect('product.image', 'image')
      .addSelect('product.stock', 'stock')
      .addSelect('category.name', 'category')
      .addSelect('category.id', 'category_id')
      .where('product.active = :active', { active: true });
  }

  listActive(filters: ProductFilters = {}): Promise<ProductDTO[]> {
    const query = this.query();
    if (filters.q) {
      const search = '%' + filters.q.replace(/[\\%_]/g, '\\$&') + '%';
      query.andWhere('(product.name ILIKE :search OR product.description ILIKE :search)', { search });
    }
    if (filters.category) query.andWhere('product.categoryId = :category', { category: filters.category });
    if (filters.minPrice) query.andWhere('product.price >= :minPrice', { minPrice: filters.minPrice });
    if (filters.maxPrice) query.andWhere('product.price <= :maxPrice', { maxPrice: filters.maxPrice });
    return query.orderBy('product.name', 'ASC').addOrderBy('product.id', 'ASC').getRawMany<ProductDTO>();
  }

  async findActiveById(id: string): Promise<ProductDTO | null> {
    return await this.query().andWhere('product.id = :id', { id }).getRawOne<ProductDTO>() ?? null;
  }
}
