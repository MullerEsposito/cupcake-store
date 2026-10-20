import { ApplicationError } from '#shared/errors/ApplicationError';

const states = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));

export function validateState(input: unknown): string {
  if (typeof input !== 'string' || !states.has(input.toUpperCase())) {
    throw new ApplicationError('VALIDATION', 'Selecione uma UF brasileira válida.');
  }
  return input.toUpperCase();
}
