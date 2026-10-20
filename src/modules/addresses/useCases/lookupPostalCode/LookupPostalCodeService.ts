import type { IPostalCodeProvider } from '../../contracts/IPostalCodeProvider.js';
import type { IUsersRepository } from '#repositories/IUsersRepository';
import { requireActiveUser } from '../../../users/validators/requireActiveUser.js';
import { validatePostalCode } from '../../validators/validatePostalCode.js';

export class LookupPostalCodeService {
  constructor(private readonly provider: IPostalCodeProvider, private readonly users: IUsersRepository) {}

  async execute(userId: string | null | undefined, input: unknown) {
    await requireActiveUser(userId, this.users);
    return this.provider.lookup(validatePostalCode(input));
  }
}
