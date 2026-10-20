import { ApplicationError } from '#shared/errors/ApplicationError';
import { inputObject } from '../../addresses/validators/validateAddress.js';
import type { CheckoutInput, PayOrderInput, PaymentMethod } from '../contracts/OrderContracts.js';

export function validateOrderId(input: unknown): string {
  if (typeof input !== 'string' || !/^[1-9]\d{0,17}$/.test(input)) {
    throw new ApplicationError('VALIDATION', 'Identificador inválido.');
  }
  return input;
}

function method(input: unknown): PaymentMethod {
  if (input !== 'PIX' && input !== 'CARTAO' && input !== 'BOLETO') {
    throw new ApplicationError('VALIDATION', 'Escolha PIX, cartão ou boleto para a simulação.');
  }
  return input;
}

function key(input: unknown): string {
  if (typeof input !== 'string' || !/^[a-zA-Z0-9_-]{16,128}$/.test(input)) {
    throw new ApplicationError('VALIDATION', 'Chave de idempotência inválida.');
  }
  return input;
}

export function validateCheckout(input: unknown): CheckoutInput {
  const data = inputObject(input, ['addressId', 'method', 'idempotencyKey', 'expectedSubtotal']);
  if (typeof data.expectedSubtotal !== 'string' || !/^\d{1,10}\.\d{2}$/.test(data.expectedSubtotal)) {
    throw new ApplicationError('VALIDATION', 'Atualize o resumo do carrinho antes de continuar.');
  }
  return { addressId: validateOrderId(data.addressId), method: method(data.method), idempotencyKey: key(data.idempotencyKey), expectedSubtotal: data.expectedSubtotal };
}

export function validatePayment(input: unknown): PayOrderInput {
  const data = inputObject(input, ['method', 'outcome', 'idempotencyKey']);
  if (data.outcome !== 'APROVADO' && data.outcome !== 'RECUSADO' && data.outcome !== 'FALHA') {
    throw new ApplicationError('VALIDATION', 'Resultado de simulação inválido.');
  }
  return { method: method(data.method), outcome: data.outcome, idempotencyKey: key(data.idempotencyKey) };
}
