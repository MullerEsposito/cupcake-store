import { inputObject } from '../../addresses/validators/validateAddress.js';
import { validatePage } from '../../admin/validators/admin-input.js';
import { validateOrderId } from '../../orders/validators/validateCheckout.js';
import { ApplicationError } from '#shared/errors/ApplicationError';
import { movementTypes } from '../contracts/InventoryContracts.js';
import type { InventoryFilter, MovementType } from '../contracts/InventoryContracts.js';

function date(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000') || !Number.isFinite(Date.parse(value))
    || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new ApplicationError('VALIDATION', 'Informe datas válidas no formato AAAA-MM-DD.');
  }
  return value;
}

export function validateInventoryFilter(input: unknown): InventoryFilter {
  const data = inputObject(input, ['page','productId','type','actorId','orderId','from','to']);
  const result: InventoryFilter = validatePage(data.page === undefined ? {} : { page: data.page });
  for (const field of ['productId','actorId','orderId'] as const) if (data[field] !== undefined) result[field] = validateOrderId(data[field]);
  if (data.type !== undefined) {
    if (typeof data.type !== 'string' || !movementTypes.includes(data.type as MovementType)) throw new ApplicationError('VALIDATION', 'Tipo de movimentação inválido.');
    result.type = data.type as MovementType;
  }
  if (data.from !== undefined) result.from = date(data.from);
  if (data.to !== undefined) result.to = date(data.to);
  if (result.from && result.to && result.from > result.to) throw new ApplicationError('VALIDATION', 'O início do período deve ser anterior ao fim.');
  return result;
}
