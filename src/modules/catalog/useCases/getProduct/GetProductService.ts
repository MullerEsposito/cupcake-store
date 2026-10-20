import { ApplicationError } from '#shared/errors/ApplicationError';
import { validateProductId } from '#validators/validateProductId';
import type { ProductDTO } from '#dtos/ProductDTO';
import type { IProductsRepository } from '#repositories/IProductsRepository';

export class GetProductService {
  constructor(private readonly productsRepository: IProductsRepository) {}

  async execute(id: unknown): Promise<ProductDTO> {
    validateProductId(id);
    const product = await this.productsRepository.findActiveById(id);
    if (!product) throw new ApplicationError('NOT_FOUND', 'Produto não encontrado.');
    return product;
  }
}
