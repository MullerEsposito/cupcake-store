import { ApplicationError } from '#shared/errors/ApplicationError';
import { inputObject } from '../../addresses/validators/validateAddress.js';
import { validateOrderId } from '../../orders/validators/validateCheckout.js';
import { orderStatuses, validateTransition } from '../../orders/entities/order-status.js';
import type { OrderStatus } from '../../orders/entities/order-status.js';
import type { PageInput, OrderFilter, ProductWrite, CategoryWrite, StockAdjustment, OrderTransition } from '../contracts/AdminContracts.js';

function invalid(message = 'Dados administrativos inválidos.'): never { throw new ApplicationError('VALIDATION', message); }

function text(value: unknown, maximum: number, empty = false): string {
  if (typeof value !== 'string' || value.trim().length > maximum || (!empty && !value.trim()) || /[\u0000-\u001f]/.test(value)) invalid();
  return value.trim();
}

function decimal(value: unknown, digits: number, scale: number): string {
  if (typeof value !== 'string' || !new RegExp(`^\\d{1,${digits}}(?:\\.\\d{1,${scale}})?$`).test(value)) invalid();
  const [whole, fraction = ''] = value.split('.');
  return `${BigInt(whole)}.${fraction.padEnd(scale, '0')}`;
}

function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') invalid();
  return value;
}

function revision(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) invalid('Atualize os dados antes de editar.');
  return value;
}

function stock(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 2147483647) invalid('Estoque inválido.');
  return value;
}

export function validatePage(input: unknown): PageInput {
  const data = inputObject(input, ['page']);
  if (data.page === undefined) return { page: 1 };
  if (typeof data.page !== 'string' || !/^[1-9]\d{0,5}$/.test(data.page)) invalid('Página inválida.');
  return { page: Number(data.page) };
}

export function validateOrderFilter(input: unknown): OrderFilter {
  const data = inputObject(input, ['page', 'status']);
  const result: OrderFilter = validatePage(data.page === undefined ? {} : { page: data.page });
  if (data.status !== undefined) {
    if (typeof data.status !== 'string' || !orderStatuses.includes(data.status as OrderStatus)) invalid('Estado de pedido inválido.');
    result.status = data.status as OrderStatus;
  }
  return result;
}

export function validateProductWrite(input: unknown, updating: boolean): ProductWrite {
  const data = inputObject(input, ['categoryId', 'name', 'description', 'price', 'weight', 'image', 'active', updating ? 'revision' : 'initialStock']);
  const image = text(data.image, 2000);
  if (!/^\/(?!\/)[a-zA-Z0-9_./-]+$/.test(image)) {
    try { const url = new URL(image); if (url.protocol !== 'https:' || url.username || url.password) invalid('Use uma imagem local ou HTTPS.'); }
    catch { invalid('Use uma imagem local ou HTTPS.'); }
  }
  return { categoryId: validateOrderId(data.categoryId), name: text(data.name, 150), description: text(data.description, 3000, true),
    price: decimal(data.price, 10, 2), weight: decimal(data.weight, 7, 3), image, active: boolean(data.active),
    ...(updating ? { revision: revision(data.revision) } : { initialStock: stock(data.initialStock) }) };
}

export function validateCategoryWrite(input: unknown, updating: boolean): CategoryWrite {
  const data = inputObject(input, ['name', 'description', 'active', ...(updating ? ['revision'] : [])]);
  return { name: text(data.name, 100), description: data.description === null ? null : text(data.description, 2000, true),
    active: boolean(data.active), ...(updating ? { revision: revision(data.revision) } : {}) };
}

export function validateStockAdjustment(input: unknown): StockAdjustment {
  const data = inputObject(input, ['expectedStock', 'delta', 'reason']);
  if (typeof data.delta !== 'number' || !Number.isInteger(data.delta) || data.delta === 0 || Math.abs(data.delta) > 2147483647) invalid('Informe uma variação inteira não nula de estoque.');
  const reason = text(data.reason, 500);
  if (reason.length < 5) invalid('Informe um motivo com 5 a 500 caracteres.');
  return { expectedStock: stock(data.expectedStock), delta: data.delta, reason };
}

export function validateOrderTransition(input: unknown): OrderTransition {
  const data = inputObject(input, ['expectedStatus', 'status']);
  if (!orderStatuses.includes(data.expectedStatus as OrderStatus) || !orderStatuses.includes(data.status as OrderStatus)) invalid('Estado de pedido inválido.');
  const result = { expectedStatus: data.expectedStatus as OrderStatus, status: data.status as OrderStatus };
  validateTransition(result.expectedStatus, result.status);
  return result;
}
