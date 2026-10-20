import { ApplicationError } from '#shared/errors/ApplicationError';
import { inputObject } from '../../addresses/validators/validateAddress.js';
import type { CancellationInput } from '../contracts/CancellationContracts.js';

export const cancellableStatuses = ['AGUARDANDO_PAGAMENTO', 'PAGAMENTO_APROVADO', 'EM_PREPARACAO'] as const;

export function validateCancellation(input: unknown): CancellationInput {
  const data = inputObject(input, ['reason', 'expectedStatus', 'idempotencyKey']);
  if (typeof data.reason !== 'string' || data.reason.trim().length < 5 || data.reason.trim().length > 500
    || /[\u0000-\u001f]/.test(data.reason)) {
    throw new ApplicationError('VALIDATION', 'Informe o motivo do cancelamento com 5 a 500 caracteres.');
  }
  if (!cancellableStatuses.includes(data.expectedStatus as CancellationInput['expectedStatus'])) {
    throw new ApplicationError('VALIDATION', 'Este estado não permite cancelamento.');
  }
  if (typeof data.idempotencyKey !== 'string' || !/^[a-zA-Z0-9_-]{16,128}$/.test(data.idempotencyKey)) {
    throw new ApplicationError('VALIDATION', 'Chave de idempotência inválida.');
  }
  return { reason: data.reason.trim(), expectedStatus: data.expectedStatus as CancellationInput['expectedStatus'], idempotencyKey: data.idempotencyKey };
}

export function validateCancellationState(status: string, expectedStatus: string): void {
  if (!cancellableStatuses.includes(status as CancellationInput['expectedStatus'])) {
    throw new ApplicationError('CONFLICT', 'Não é possível cancelar após a saída para entrega ou após o encerramento do pedido.');
  }
  if (status !== expectedStatus) throw new ApplicationError('CONFLICT', 'O estado do pedido mudou. Atualize antes de confirmar o cancelamento.');
}

export function validateCancellationPayment(status: string, total: string, payment: { amount: string; simulated: boolean } | null): void {
  if (status === 'AGUARDANDO_PAGAMENTO' ? payment !== null : !payment || !payment.simulated || payment.amount !== total) {
    throw new ApplicationError('CONFLICT', 'O pagamento e o estado do pedido estão inconsistentes; cancelamento não realizado.');
  }
}
