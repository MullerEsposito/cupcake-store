import type { Repository } from 'typeorm';
import { StockMovement } from '../../../entities/StockMovement.js';
import { User } from '#entities/User';
import { getRepository } from '#infrastructure/typeorm/repository-context';
import { ApplicationError } from '#shared/errors/ApplicationError';
import type { IInventoryRepository } from '../../IInventoryRepository.js';
import type { InventoryFilter, InventoryPage } from '../../../contracts/InventoryContracts.js';

export class InventoryRepository implements IInventoryRepository {
  private readonly repository: Repository<StockMovement>;

  constructor() { this.repository = getRepository(StockMovement); }

  list(userId: string, input: InventoryFilter): Promise<InventoryPage> {
    return this.repository.manager.transaction('REPEATABLE READ', async manager => {
      const user = await manager.findOne(User, { where: { id: userId, active: true } });
      if (!user) throw new ApplicationError('UNAUTHORIZED', 'Entre novamente na sua conta.');
      if (user.role !== 'ADMIN') throw new ApplicationError('FORBIDDEN', 'Acesso exclusivo para administradores.');
      const query = manager.getRepository(StockMovement).createQueryBuilder('movement');
      for (const field of ['productId','actorId','orderId','type'] as const) {
        if (input[field] !== undefined) query.andWhere(`movement.${field} = :${field}`, { [field]: input[field] });
      }
      if (input.from) query.andWhere("movement.createdAt >= (CAST(:from AS date)::timestamp AT TIME ZONE 'America/Sao_Paulo')", { from: input.from });
      if (input.to) query.andWhere("movement.createdAt < ((CAST(:to AS date) + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')", { to: input.to });
      const pageSize = 20;
      const [movements, total] = await query.orderBy('movement.createdAt', 'DESC').addOrderBy('movement.id', 'DESC')
        .skip((input.page - 1) * pageSize).take(pageSize).getManyAndCount();
      return { items: movements.map(movement => ({ ...movement, createdAt: movement.createdAt.toISOString() })), total, page: input.page, pageSize };
    });
  }
}
