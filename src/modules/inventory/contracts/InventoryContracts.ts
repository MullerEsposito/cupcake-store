export const movementTypes = ['ABERTURA', 'INICIALIZACAO', 'REPOSICAO', 'CORRECAO', 'VENDA', 'DEVOLUCAO'] as const;
export type MovementType = typeof movementTypes[number];
export interface InventoryFilter {
  page: number; productId?: string; type?: MovementType; actorId?: string; orderId?: string;
  from?: string; to?: string;
}
export interface StockMovementDTO {
  id: string; productId: string; productName: string; type: MovementType;
  quantity: number; previousStock: number; currentStock: number; reason: string;
  actorId: string | null; actorRole: string; origin: 'SISTEMA' | 'ADMINISTRATIVO';
  orderId: string | null; paymentId: string | null; cancellationId: string | null; createdAt: string;
}
export interface InventoryPage { items: StockMovementDTO[]; page: number; pageSize: number; total: number }
