import type { AddressInput } from '../../addresses/contracts/AddressContracts.js';
import type { CancellationDTO } from './CancellationContracts.js';

export type PaymentMethod = 'PIX' | 'CARTAO' | 'BOLETO';
export type PaymentOutcome = 'APROVADO' | 'RECUSADO' | 'FALHA';
export interface CheckoutInput { addressId: string; method: PaymentMethod; idempotencyKey: string; expectedSubtotal: string }
export interface PayOrderInput { method: PaymentMethod; outcome: PaymentOutcome; idempotencyKey: string }
export interface PaymentDTO {
  id: string; method: string; status: string; amount: string; simulated: boolean;
  idempotencyKey: string; reason: string | null;
}
export interface OrderDTO {
  id: string; number: string; status: string; createdAt: string;
  address: AddressInput; subtotal: string; shipping: string; total: string;
  items: { productId: string; name: string; quantity: number; unitPrice: string; lineTotal: string }[];
  payments: PaymentDTO[];
  cancellation: CancellationDTO | null;
}
