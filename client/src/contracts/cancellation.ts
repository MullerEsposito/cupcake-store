export interface CancellationInput {
  reason: string;
  expectedStatus: string;
  idempotencyKey: string;
}

export interface Cancellation {
  id: string; actorId: string; actorRole: string; previousStatus: string; reason: string; createdAt: string;
  paymentId: string | null; refundStatus: string; refundAmount: string; refundedAt: string | null;
  stockRestored: boolean; simulated: boolean;
}

export function canCancel(status: string): boolean {
  return ['AGUARDANDO_PAGAMENTO', 'PAGAMENTO_APROVADO', 'EM_PREPARACAO'].includes(status);
}
