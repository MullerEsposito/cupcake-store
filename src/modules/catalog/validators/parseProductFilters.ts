import { ApplicationError } from '#shared/errors/ApplicationError';
import type { ProductFilters } from '../contracts/ProductFilters.js';

function price(value: unknown): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,9})(\.[0-9]{1,2})?$/.test(value)) {
    throw new ApplicationError('VALIDATION', 'Informe preços válidos, com até duas casas decimais.');
  }
  const [whole, fraction = ''] = value.split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
}

export function parseProductFilters(input: unknown = {}): ProductFilters {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ApplicationError('VALIDATION', 'Filtros inválidos.');
  const values = input as Record<string, unknown>;
  if (values.q !== undefined && (typeof values.q !== 'string' || values.q.length > 100)) {
    throw new ApplicationError('VALIDATION', 'A busca deve ter até 100 caracteres.');
  }
  if (values.category !== undefined && values.category !== '' &&
    (typeof values.category !== 'string' || !/^[1-9][0-9]{0,17}$/.test(values.category))) {
    throw new ApplicationError('VALIDATION', 'Categoria inválida.');
  }
  const minPrice = price(values.minPrice);
  const maxPrice = price(values.maxPrice);
  if (minPrice && maxPrice && BigInt(minPrice.replace('.', '')) > BigInt(maxPrice.replace('.', ''))) {
    throw new ApplicationError('VALIDATION', 'O preço mínimo não pode superar o máximo.');
  }
  return {
    ...(typeof values.q === 'string' && values.q.trim() ? { q: values.q.trim() } : {}),
    ...(typeof values.category === 'string' && values.category ? { category: values.category } : {}),
    ...(minPrice ? { minPrice } : {}), ...(maxPrice ? { maxPrice } : {})
  };
}
