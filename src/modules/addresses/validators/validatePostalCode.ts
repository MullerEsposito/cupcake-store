import { ApplicationError } from '#shared/errors/ApplicationError';

export function validatePostalCode(input: unknown): string {
  if (typeof input !== 'string' || !/^\d{5}-?\d{3}$/.test(input)) {
    throw new ApplicationError('VALIDATION', 'Informe um CEP de oito dígitos.');
  }
  return input.replace('-', '');
}
