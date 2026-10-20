import type { User } from '#entities/User';

export interface PublicUserDTO {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function presentUser(user: Pick<User, 'id' | 'name' | 'email' | 'role'>): PublicUserDTO {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
