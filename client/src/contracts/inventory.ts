import type { Page } from './admin';

export const movementLabels = {
  ABERTURA: 'Saldo de abertura', INICIALIZACAO: 'Estoque inicial', REPOSICAO: 'Reposição',
  CORRECAO: 'Correção', VENDA: 'Venda simulada', DEVOLUCAO: 'Devolução por cancelamento'
} as const;
export type MovementType = keyof typeof movementLabels;
export interface InventoryFilter {
  productId?: string; type?: MovementType; actorId?: string; orderId?: string; from?: string; to?: string;
}
export interface StockMovement {
  id: string; productId: string; productName: string; type: MovementType; quantity: number;
  previousStock: number; currentStock: number; reason: string; actorId: string | null;
  actorRole: string; origin: 'SISTEMA' | 'ADMINISTRATIVO'; orderId: string | null;
  paymentId: string | null; cancellationId: string | null; createdAt: string;
}
export type InventoryPage = Page<StockMovement>;
