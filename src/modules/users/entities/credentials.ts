import { ApplicationError } from '#shared/errors/ApplicationError';

export function validateCredentials(input: unknown, { registration = false } = {}) {
  const fields: Record<string, unknown> = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {};
  const email = typeof fields.email === 'string' ? fields.email.trim().toLowerCase() : '';
  const password = typeof fields.password === 'string' ? fields.password : '';
  const name = typeof fields.name === 'string' ? fields.name.trim() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApplicationError('VALIDATION', 'Informe um e-mail válido.');
  }
  if (password.length > 128 || password.length < (registration ? 12 : 1)) {
    throw new ApplicationError('VALIDATION', registration ? 'Use uma senha entre 12 e 128 caracteres.' : 'Informe sua senha.');
  }
  if (registration && (name.length < 2 || name.length > 150)) {
    throw new ApplicationError('VALIDATION', 'Informe um nome entre 2 e 150 caracteres.');
  }
  return { email, password, name };
}
