import { AdministrationRepository } from '../../repositories/implementations/typeorm/AdministrationRepository.js';
import { UsersRepository } from '#repositories/UsersRepository';
import { AdvanceOrderController } from './AdvanceOrderController.js';
import { AdvanceOrderService } from './AdvanceOrderService.js';

export function getAdvanceOrderController(): AdvanceOrderController {
  const repository = new AdministrationRepository();
  const users = new UsersRepository();
  const service = new AdvanceOrderService(repository, users);
  return new AdvanceOrderController(service);
}
