import type { CartLine } from '../../../contracts/storefront';

export function validateCartQuantity(value: string, item: Pick<CartLine, 'name' | 'stock'>): string {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1) {
    return `${item.name}: informe uma quantidade inteira de pelo menos 1 unidade.`;
  }
  const limit = Math.min(item.stock, 99);
  if (quantity > limit) {
    return `${item.name}: a quantidade máxima disponível é ${limit}.`;
  }
  return '';
}
