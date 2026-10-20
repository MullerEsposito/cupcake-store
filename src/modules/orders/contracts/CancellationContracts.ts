export interface CancellationInput {
  reason: string;
  expectedStatus: 'AGUARDANDO_PAGAMENTO' | 'PAGAMENTO_APROVADO' | 'EM_PREPARACAO';
  idempotencyKey: string;
}

export interface CancellationDTO {
  id: string; actorId: string; actorRole: string; previousStatus: string; reason: string; createdAt: string;
  paymentId: string | null; refundStatus: string; refundAmount: string; refundedAt: string | null;
  stockRestored: boolean; simulated: boolean;
}
