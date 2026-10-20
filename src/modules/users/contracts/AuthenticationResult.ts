import type { PublicUserDTO } from '#dtos/PublicUserDTO';

export interface AuthenticationResult {
  user: PublicUserDTO;
  token: string;
}
