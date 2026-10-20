import { ApplicationError } from '#shared/errors/ApplicationError';

export const orderStatuses = ['AGUARDANDO_PAGAMENTO', 'PAGAMENTO_APROVADO', 'EM_PREPARACAO', 'SAIU_PARA_ENTREGA', 'ENTREGUE', 'CANCELADO'] as const;
export type OrderStatus = typeof orderStatuses[number];
export const nextOrderStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  PAGAMENTO_APROVADO: 'EM_PREPARACAO', EM_PREPARACAO: 'SAIU_PARA_ENTREGA', SAIU_PARA_ENTREGA: 'ENTREGUE'
};

export function validateTransition(expected: OrderStatus, target: OrderStatus): void {
  if (nextOrderStatus[expected] !== target) {
    throw new ApplicationError('CONFLICT', 'Avanço inválido. Siga as etapas de preparação, saída e entrega.');
  }
}
