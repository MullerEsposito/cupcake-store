import { presentUser } from '#dtos/PublicUserDTO';
import type { PublicUserDTO } from '#dtos/PublicUserDTO';
import type { IUsersRepository } from '#repositories/IUsersRepository';

export class GetCurrentUserService {
  constructor(private readonly usersRepository: IUsersRepository) {}

  async execute(id: string | null): Promise<PublicUserDTO | null> {
    const user = id ? await this.usersRepository.findActiveById(id) : null;
    return user ? presentUser(user) : null;
  }
}
