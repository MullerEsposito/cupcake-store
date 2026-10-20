import type { CartChange, CartDTO, CartOwner } from '../contracts/CartContracts.js';

export interface ICartsRepository {
  get(owner: CartOwner): Promise<CartDTO>;
  change(owner: CartOwner, change: CartChange): Promise<CartDTO>;
  merge(userId: string, guestHash: string | null): Promise<CartDTO>;
}
