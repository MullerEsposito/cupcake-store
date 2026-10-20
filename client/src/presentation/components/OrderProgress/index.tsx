import { Progress } from './styles';
import { orderSteps, statusLabel } from '../../order-status';

export function OrderProgress({ status }: { status: string }) {
  const current = orderSteps.findIndex(step => step.status === status);
  if (current < 0) return <p role="status">{statusLabel(status)}</p>;
  return <Progress className="order-progress" aria-label="Etapas do pedido">{orderSteps.map((step, index) => <li key={step.status}
    className={index <= current ? 'reached' : ''} aria-current={index === current ? 'step' : undefined}>
    <span aria-hidden="true">{index < current ? '✓' : index + 1}</span>{step.label}
    {index === current && <strong> Etapa atual</strong>}
  </li>)}</Progress>;
}
