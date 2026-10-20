export const orderSteps = [
  { status: 'AGUARDANDO_PAGAMENTO', label: 'Aguardando pagamento' },
  { status: 'PAGAMENTO_APROVADO', label: 'Pagamento aprovado' },
  { status: 'EM_PREPARACAO', label: 'Em preparação' },
  { status: 'SAIU_PARA_ENTREGA', label: 'Saiu para entrega' },
  { status: 'ENTREGUE', label: 'Entregue' }
];

export function statusLabel(status: string): string {
  return status === 'CANCELADO' ? 'Cancelado' : orderSteps.find(step => step.status === status)?.label ?? status;
}

export function nextStatus(status: string): string | null {
  const index = orderSteps.findIndex(step => step.status === status);
  return index >= 1 && index < orderSteps.length - 1 ? orderSteps[index + 1].status : null;
}
