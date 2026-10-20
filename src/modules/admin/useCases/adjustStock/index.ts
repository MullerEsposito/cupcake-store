import { AdministrationRepository } from '../../repositories/implementations/typeorm/AdministrationRepository.js';
import { UsersRepository } from '#repositories/UsersRepository';
import { AdjustStockController } from './AdjustStockController.js';
import { AdjustStockService } from './AdjustStockService.js';

export function getAdjustStockController(): AdjustStockController {
  const repository = new AdministrationRepository();
  const users = new UsersRepository();
  const service = new AdjustStockService(repository, users);
  return new AdjustStockController(service);
}
