import type { AddressInput } from '../contracts/AddressContracts.js';
import { ApplicationError } from '#shared/errors/ApplicationError';

const states = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));

export function inputObject(input: unknown, fields: string[]): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)
    || Object.keys(input).some(key => !fields.includes(key))) {
    throw new ApplicationError('VALIDATION', 'Dados inválidos ou campos não permitidos.');
  }
  return input as Record<string, unknown>;
}

export function validateAddress(input: unknown): AddressInput {
  const data = inputObject(input, ['recipient', 'postalCode', 'street', 'number', 'complement', 'district', 'city', 'state']);
  function text(field: string, maximum: number): string {
    const value = data[field];
    if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum || /[\u0000-\u001f]/.test(value)) {
      throw new ApplicationError('VALIDATION', `Preencha corretamente o campo ${field}.`);
    }
    return value.trim();
  }
  const postalCode = text('postalCode', 9).replace('-', '');
  const state = text('state', 2).toUpperCase();
  if (!/^\d{8}$/.test(postalCode) || !states.has(state)) {
    throw new ApplicationError('VALIDATION', 'Informe um CEP de oito dígitos e uma UF válida.');
  }
  const complement = data.complement === undefined || data.complement === null || data.complement === ''
    ? null : text('complement', 150);
  return { recipient: text('recipient', 150), postalCode, street: text('street', 200), number: text('number', 20),
    complement, district: text('district', 100), city: text('city', 100), state };
}
