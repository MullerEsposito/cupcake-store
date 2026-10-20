import { createHash } from 'node:crypto';
import type { EntityManager, Repository } from 'typeorm';
import { Product } from '#entities/Product';
import { Category } from '#entities/Category';
import { User } from '#entities/User';
import { Order } from '#entities/Order';
import { Payment } from '#entities/Payment';
import { getRepository } from '#infrastructure/typeorm/repository-context';
import { ApplicationError } from '#shared/errors/ApplicationError';
import { presentOrder } from '../../../../orders/repositories/implementations/typeorm/present-order.js';
import { validateTransition } from '../../../../orders/entities/order-status.js';
import type { IAdministrationRepository } from '../../IAdministrationRepository.js';
import type { AdminProduct, AdminCategory, AdminOrder, PageInput, OrderFilter, ProductWrite,
  CategoryWrite, StockAdjustment, OrderTransition } from '../../../contracts/AdminContracts.js';

const PAGE_SIZE = 20;

function revision(values: unknown[]): string {
  return createHash('sha256').update(JSON.stringify(values)).digest('hex');
}

function presentProduct(product: Product): AdminProduct {
  const fields = { categoryId: product.categoryId, name: product.name, description: product.description,
    price: product.price, weight: product.weight, image: product.image, active: product.active };
  return { ...fields, id: product.id, stock: product.stock, revision: revision(Object.values(fields)) };
}

function presentCategory(category: Category): AdminCategory {
  return { id: category.id, name: category.name, description: category.description, active: category.active,
    revision: revision([category.name, category.description, category.active]) };
}

async function presentAdminOrder(manager: EntityManager, order: Order): Promise<AdminOrder> {
  const customer = await manager.findOneByOrFail(User, { id: order.userId });
  return { ...await presentOrder(manager, order), customer: { id: customer.id, name: customer.name, email: customer.email } };
}

export class AdministrationRepository implements IAdministrationRepository {
  private readonly repository: Repository<Product>;

  constructor() { this.repository = getRepository(Product); }

  private run<Result>(userId: string, operation: (manager: EntityManager) => Promise<Result>, snapshot = false): Promise<Result> {
    return this.repository.manager.transaction(snapshot ? 'REPEATABLE READ' : 'READ COMMITTED', async manager => {
      const user = await manager.findOne(User, { where: { id: userId, active: true }, lock: { mode: 'pessimistic_read' } });
      if (!user) throw new ApplicationError('UNAUTHORIZED', 'Entre novamente na sua conta.');
      if (user.role !== 'ADMIN') throw new ApplicationError('FORBIDDEN', 'Acesso exclusivo para administradores.');
      return operation(manager);
    });
  }

  async catalog(userId: string, input: PageInput) {
    return this.run(userId, async manager => {
      const [products, total] = await manager.findAndCount(Product, { order: { id: 'DESC' }, skip: (input.page - 1) * PAGE_SIZE, take: PAGE_SIZE });
      const categories = await manager.find(Category, { order: { name: 'ASC', id: 'ASC' }, take: 200 });
      return { products: { items: products.map(presentProduct), page: input.page, pageSize: PAGE_SIZE, total }, categories: categories.map(presentCategory) };
    });
  }

  async saveProduct(userId: string, id: string | undefined, input: ProductWrite): Promise<AdminProduct> {
    return this.run(userId, async manager => {
      const existing = id ? await manager.findOne(Product, { where: { id }, lock: { mode: 'pessimistic_write' } }) : null;
      if (id && !existing) throw new ApplicationError('NOT_FOUND', 'Produto não encontrado.');
      if (existing && presentProduct(existing).revision !== input.revision) {
        throw new ApplicationError('CONFLICT', 'O produto foi alterado. Atualize o painel antes de editar.');
      }
      const category = await manager.findOne(Category, { where: { id: input.categoryId }, lock: { mode: 'pessimistic_read' } });
      if (!category || (input.active && !category.active)) throw new ApplicationError('CONFLICT', 'Selecione uma categoria ativa para disponibilizar o produto.');
      const fields = { categoryId: input.categoryId, name: input.name, description: input.description,
        price: input.price, weight: input.weight, image: input.image, active: input.active };
      const product = existing ? Object.assign(existing, fields) : manager.create(Product, { ...fields, stock: input.initialStock });
      return presentProduct(await manager.save(Product, product));
    });
  }

  async saveCategory(userId: string, id: string | undefined, input: CategoryWrite): Promise<AdminCategory> {
    return this.run(userId, async manager => {
      const existing = id ? await manager.findOne(Category, { where: { id }, lock: { mode: 'pessimistic_write' } }) : null;
      if (id && !existing) throw new ApplicationError('NOT_FOUND', 'Categoria não encontrada.');
      if (existing && presentCategory(existing).revision !== input.revision) throw new ApplicationError('CONFLICT', 'A categoria foi alterada. Atualize o painel.');
      if (existing && !input.active && await manager.existsBy(Product, { categoryId: id, active: true })) {
        throw new ApplicationError('CONFLICT', 'Desative primeiro os produtos ativos desta categoria.');
      }
      const fields = { name: input.name, description: input.description, active: input.active };
      const category = existing ? Object.assign(existing, fields) : manager.create(Category, fields);
      return presentCategory(await manager.save(Category, category));
    });
  }

  async adjustStock(userId: string, id: string, input: StockAdjustment): Promise<AdminProduct> {
    return this.run(userId, async manager => {
      const product = await manager.findOne(Product, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!product) throw new ApplicationError('NOT_FOUND', 'Produto não encontrado.');
      if (product.stock !== input.expectedStock) throw new ApplicationError('CONFLICT', 'O estoque mudou. Atualize o painel antes de ajustar.');
      const stock = product.stock + input.delta;
      if (!Number.isSafeInteger(stock) || stock < 0 || stock > 2147483647) throw new ApplicationError('CONFLICT', 'O ajuste ultrapassa os limites do estoque.');
      product.stock = stock;
      return presentProduct(await manager.save(Product, product));
    });
  }

  async orders(userId: string, input: OrderFilter) {
    return this.run(userId, async manager => {
      const [orders, total] = await manager.findAndCount(Order, { where: input.status ? { status: input.status } : {},
        order: { id: 'DESC' }, skip: (input.page - 1) * PAGE_SIZE, take: PAGE_SIZE });
      const items: AdminOrder[] = [];
      for (const order of orders) items.push(await presentAdminOrder(manager, order));
      return { items, page: input.page, pageSize: PAGE_SIZE, total };
    }, true);
  }

  async advanceOrder(userId: string, id: string, input: OrderTransition): Promise<AdminOrder> {
    validateTransition(input.expectedStatus, input.status);
    return this.run(userId, async manager => {
      const order = await manager.findOne(Order, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!order) throw new ApplicationError('NOT_FOUND', 'Pedido não encontrado.');
      if (order.status !== input.expectedStatus && order.status !== input.status) {
        throw new ApplicationError('CONFLICT', 'O pedido mudou. Atualize o painel antes de continuar.');
      }
      if (!await manager.existsBy(Payment, { orderId: id, status: 'APROVADO', amount: order.total, simulated: true })) {
        throw new ApplicationError('CONFLICT', 'O pedido precisa de pagamento aprovado para avançar.');
      }
      if (order.status !== input.status) {
        order.status = input.status;
        await manager.save(Order, order);
      }
      return presentAdminOrder(manager, order);
    });
  }
}
