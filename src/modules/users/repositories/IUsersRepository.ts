import type { User } from '#entities/User';
import type { LoginState } from '../contracts/LoginState.js';

export interface CreateClientInput {
  name: string;
  email: string;
  passwordHash: string;
}
export type SaveLoginState = (id: string, state: LoginState) => Promise<void>;
export interface IUsersRepository {
  createClient(input: CreateClientInput): Promise<User>;
  findActiveById(id: string): Promise<User | null>;
  withLockedUser<Result>(
    email: string,
    operation: (user: User | null, saveLoginState: SaveLoginState) => Promise<Result>
  ): Promise<Result>;
}
