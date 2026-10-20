import type { IOrdersRepository } from '../../repositories/IOrdersRepository.js';
import type { IUsersRepository } from '#repositories/IUsersRepository';
import { requireActiveUser } from '../../../users/validators/requireActiveUser.js';

export class ListOrdersService {
  constructor(private readonly repository: IOrdersRepository, private readonly users: IUsersRepository) {}

  async execute(userId: string | null | undefined) {
    userId = await requireActiveUser(userId, this.users);
    return this.repository.list(userId);
  }
}
