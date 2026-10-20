import { ApplicationError } from '#shared/errors/ApplicationError';

export function validateProductId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !/^[1-9][0-9]{0,17}$/.test(id)) {
    throw new ApplicationError('NOT_FOUND', 'Produto não encontrado.');
  }
}
