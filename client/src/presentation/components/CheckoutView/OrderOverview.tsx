import type { Order } from '../../../contracts/storefront';
import { formatPrice } from '../../format-price';
import { orderSteps, statusLabel } from '../../order-status';
import { OrderProgress } from '../OrderProgress';
import { Overview } from './overview-styles';

const paymentStatuses: Record<string, { label: string; tone: string; icon: string }> = {
  APROVADO: { label: 'Aprovado', tone: 'success', icon: '✓' },
  RECUSADO: { label: 'Recusado', tone: 'danger', icon: '!' },
  FALHA: { label: 'Falha no pagamento', tone: 'danger', icon: '!' },
  PENDENTE: { label: 'Pendente', tone: 'warning', icon: '…' }
};

const paymentMethods: Record<string, string> = { PIX: 'Pix', CARTAO: 'Cartão', BOLETO: 'Boleto' };

export function OrderOverview({ order, busy, trackingError, onRefresh }: {
  order: Order; busy: boolean; trackingError: string; onRefresh(): void;
}) {
  const address = order.address;
  const latest = order.payments[0];
  const payment = latest && (paymentStatuses[latest.status] ??
    { label: 'Estado não informado', tone: 'neutral', icon: '•' });
  const cancelled = order.status === 'CANCELADO';

  return <Overview>
    <section className="order-card" aria-label="Acompanhamento do pedido">
      <p className="order-number">Pedido {order.number}</p>
      <div role="status"><span className="order-badge" data-tone={cancelled ? 'danger' : 'neutral'}>
        <span aria-hidden="true">{cancelled ? '×' : '•'}</span> {statusLabel(order.status)}
      </span></div>
      {orderSteps.some(step => step.status === order.status) && <OrderProgress status={order.status} />}
      {trackingError && <p role="status" className="error">{trackingError}</p>}
      <p className="hint">As etapas são atualizadas automaticamente nesta página. Não há rastreamento GPS.</p>
      <button className="detail-button" disabled={busy} onClick={onRefresh}>Atualizar acompanhamento</button>
    </section>
    <section className="order-card" aria-label="Itens do pedido">
      <h2>Itens do pedido</h2>
      <ul className="order-detail-items">{order.items.map(item => <li key={item.productId}>
        <span><strong>{item.name}</strong> <span className="order-item-quantity">× {item.quantity}</span></span>
        <span>{formatPrice(item.lineTotal)}</span>
      </li>)}</ul>
      <dl className="order-totals">
        <div><dt>Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
        <div><dt>Frete simulado</dt><dd>{formatPrice(order.shipping)}</dd></div>
        <div className="order-total"><dt>Total do pedido</dt><dd>{formatPrice(order.total)}</dd></div>
      </dl>
    </section>
    <section className="order-card" aria-label="Entrega simulada">
      <h2>Entrega simulada</h2>
      <p><strong>{address.recipient}</strong><br />
        {address.street}, {address.number}{address.complement ? `, ${address.complement}` : ''}<br />
        {address.district} · {address.city}/{address.state} · CEP {address.postalCode}
      </p>
    </section>
    <section className="order-card" aria-label="Pagamento simulado">
      <h2>Pagamento simulado</h2>
      {latest && payment ? <>
        <p role="status"><span className="order-badge" data-tone={payment.tone}>
          <span aria-hidden="true">{payment.icon}</span> {payment.label}
        </span> <span className="order-method">{paymentMethods[latest.method] ?? 'Método não informado'}</span></p>
        {latest.reason && <p>{latest.reason}</p>}
        {cancelled && <p className="hint">Este é o resultado da última tentativa de pagamento, não a situação atual do pedido.</p>}
      </> : <p>Nenhuma tentativa de pagamento registrada.</p>}
    </section>
  </Overview>;
}
