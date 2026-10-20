export type CartOwner = { kind: 'user' | 'guest'; id: string };
export interface CartAccess { owner: CartOwner; guestHash: string | null }
export type CartOperation = 'add' | 'set' | 'remove';
export interface CartChange { operation: CartOperation; productId: string; quantity: number }
export interface CartLine {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  stock: number;
  available: boolean;
}
export interface CartDTO { items: CartLine[]; total: string; totalQuantity: number; warnings: string[] }
