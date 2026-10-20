import { getRepository } from '#infrastructure/typeorm/repository-context';
import { User } from '#entities/User';
import { QueryFailedError } from 'typeorm';
import type { Repository } from 'typeorm';
import type { IUsersRepository, CreateClientInput, SaveLoginState } from '#repositories/IUsersRepository';
import { errorCode } from '#shared/errors/error-info';
import { ApplicationError } from '#shared/errors/ApplicationError';

export class UsersRepository implements IUsersRepository {
  private readonly repository: Repository<User>;

  constructor() {
    this.repository = getRepository(User);
  }

  async findActiveById(id: string): Promise<User | null> {
    const record = await this.repository.findOneBy({ id, active: true });
    return record;
  }

  async createClient({ email, name, passwordHash }: CreateClientInput): Promise<User> {
    try {
      const record = this.repository.create({ email, name, passwordHash, role: 'CLIENTE' });
      const user = await this.repository.save(record);
      if (!user) throw new Error('Usuário não retornado após cadastro.');
      return user;
    } catch (error) {
      const code = error instanceof QueryFailedError ? errorCode(error.driverError) : errorCode(error);
      if (code === '23505') throw new ApplicationError('CONFLICT', 'Este e-mail já está cadastrado. Entre na sua conta.');
      throw error;
    }
  }

  async withLockedUser<Result>(
    email: string, operation: (user: User | null, saveLoginState: SaveLoginState) => Promise<Result>
  ): Promise<Result> {
    return this.repository.manager.transaction(async manager => {
      const repository = manager.getRepository(this.repository.target);
      const record = await repository.createQueryBuilder('account')
        .addSelect('account.passwordHash')
        .where('account.email = :email', { email })
        .setLock('pessimistic_write')
        .getOne();
      const saveLoginState: SaveLoginState = async (id, state) => {
        await repository.update({ id }, state);
      };
      return operation(record, saveLoginState);
    });
  }
}
