import type { CartDTO, CartLine } from '../contracts/CartContracts.js';

export const MAX_QUANTITY = 99;
export const MAX_CART_ITEMS = 100;

export function cents(value: string): bigint {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

export function money(value: bigint): string {
  return `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`;
}

export function summarize(items: CartLine[], warnings: string[] = []): CartDTO {
  return { items, warnings, totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
    total: money(items.reduce((total, item) => total + cents(item.lineTotal), 0n)) };
}
