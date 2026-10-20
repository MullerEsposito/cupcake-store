import { InventoryRepository } from '../../repositories/implementations/typeorm/InventoryRepository.js';
import { UsersRepository } from '#repositories/UsersRepository';
import { ListStockMovementsController } from './ListStockMovementsController.js';
import { ListStockMovementsService } from './ListStockMovementsService.js';

export function getListStockMovementsController(): ListStockMovementsController {
  const repository = new InventoryRepository();
  const users = new UsersRepository();
  const service = new ListStockMovementsService(repository, users);
  return new ListStockMovementsController(service);
}
