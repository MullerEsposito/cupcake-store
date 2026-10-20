import type { ICitiesProvider } from '../../contracts/ICitiesProvider.js';
import type { IUsersRepository } from '#repositories/IUsersRepository';
import { requireActiveUser } from '../../../users/validators/requireActiveUser.js';
import { validateState } from '../../validators/validateState.js';

export class ListCitiesService {
  constructor(private readonly provider: ICitiesProvider, private readonly users: IUsersRepository) {}

  async execute(userId: string | null | undefined, input: unknown) {
    await requireActiveUser(userId, this.users);
    return this.provider.listByState(validateState(input));
  }
}
