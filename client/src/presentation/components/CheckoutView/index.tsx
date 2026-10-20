import { Container } from './styles';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { StorefrontApi, AddressInput, Cart, Order, PaymentMethod, PaymentOutcome } from '../../../contracts/storefront';
import { useResource } from '../../hooks/use-resource';
import { errorMessage } from '../../error-message';
import { formatPrice } from '../../format-price';
import { Link, useNavigate } from 'react-router';
import { OrderProgress } from '../OrderProgress';
import { statusLabel } from '../../order-status';
import { canCancel } from '../../../contracts/cancellation';
import { CancellationForm, CancellationSummary } from '../Cancellation';

const addressFields = [
  ['recipient', 'Destinatário', 150], ['postalCode', 'CEP', 9], ['street', 'Logradouro', 200], ['number', 'Número', 20],
  ['complement', 'Complemento (opcional)', 150], ['district', 'Bairro', 100], ['city', 'Cidade', 100], ['state', 'UF', 2]
] as const;

function AddressForm({ busy, onSave }: { busy: boolean; onSave(input: AddressInput): Promise<void> }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = Object.fromEntries(addressFields.map(([field]) => [field, String(form.get(field) ?? '')])) as unknown as AddressInput;
    await onSave(input);
  }
  return <form className="checkout-form" onSubmit={event => { void submit(event); }}>
    <fieldset disabled={busy}><legend>Novo endereço de entrega</legend>
      <div className="address-fields">{addressFields.map(([field, label, maximum]) => <label key={field}>{label}
        <input name={field} maxLength={maximum} required={field !== 'complement'}
          inputMode={field === 'postalCode' ? 'numeric' : 'text'}
          pattern={field === 'postalCode' ? '[0-9]{5}-?[0-9]{3}' : undefined} />
      </label>)}</div>
      <button className="button outline" type="submit">Salvar endereço</button>
    </fieldset>
  </form>;
}

export function CheckoutView({ api, cart, mode, orderId, onChanged }: {
  api: StorefrontApi; cart: Cart | null; mode: 'checkout' | 'orders' | 'detail'; orderId?: string; onChanged(): void;
}) {
  const navigate = useNavigate();
  const loadDetail = useCallback((signal: AbortSignal) => orderId ? api.order(orderId, signal) : Promise.resolve<Order | null>(null), [api, orderId]);
  const detail = useResource(loadDetail);
  const addresses = useResource(api.addresses);
  const orders = useResource(api.orders);
  const [addressId, setAddressId] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('PIX');
  const [outcome, setOutcome] = useState<PaymentOutcome>('APROVADO');
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  const generation = useRef(0);
  const [trackingError, setTrackingError] = useState('');
  const checkoutRequest = useRef<{ fingerprint: string; key: string } | null>(null);
  const paymentRequest = useRef<{ orderId: string; method: PaymentMethod; key: string } | null>(null);
  const selectedId = order?.id;
  useEffect(() => { if (detail.data) setOrder(detail.data); }, [detail.data]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const refresh = () => {
      if (document.visibilityState !== 'visible' || locked.current) return;
      const current = generation.current;
      orders.retry();
      if (selectedId) api.order(selectedId, controller.signal).then(updated => {
        if (active && generation.current === current && !locked.current) {
          setOrder(previous => previous?.id === updated.id ? updated : previous);
          setTrackingError('');
        }
      }).catch(() => { if (active && generation.current === current) setTrackingError('Não foi possível atualizar o acompanhamento. Use o botão para tentar novamente.'); });
    };
    const timer = setInterval(refresh, 30000);
    return () => { active = false; controller.abort(); clearInterval(timer); };
  }, [api, selectedId, orders.retry]);

  async function run(operation: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    generation.current++;
    setBusy(true);
    setError('');
    try { await operation(); setTrackingError(''); }
    catch (failure) { setError(errorMessage(failure)); orders.retry(); }
    finally { locked.current = false; setBusy(false); }
  }

  async function createOrder() {
    if (!cart?.items.length) return;
    await run(async () => {
      const fingerprint = JSON.stringify([addressId, method, cart.total]);
      if (checkoutRequest.current?.fingerprint !== fingerprint) checkoutRequest.current = { fingerprint, key: crypto.randomUUID() };
      const result = await api.checkout({ addressId, method, expectedSubtotal: cart.total, idempotencyKey: checkoutRequest.current.key });
      setOrder(result);
      checkoutRequest.current = null;
      orders.retry();
      onChanged();
      navigate('/pedidos/' + encodeURIComponent(result.id), { replace: true });
    });
  }

  async function pay() {
    if (!order) return;
    await run(async () => {
      const pending = order.payments.find(payment => payment.status === 'PENDENTE');
      const paymentMethod = pending ? pending.method as PaymentMethod : method;
      if (!paymentRequest.current || paymentRequest.current.orderId !== order.id || paymentRequest.current.method !== paymentMethod) {
        paymentRequest.current = { orderId: order.id, method: paymentMethod, key: pending?.idempotencyKey ?? crypto.randomUUID() };
      }
      const result = await api.payOrder(order.id, { method: paymentMethod, outcome, idempotencyKey: paymentRequest.current.key });
      setOrder(result);
      paymentRequest.current = null;
      orders.retry();
      onChanged();
    });
  }

  const pending = order?.payments.find(payment => payment.status === 'PENDENTE');
  const latest = order?.payments[0];
  const showPayment = order?.status === 'AGUARDANDO_PAGAMENTO';
  if (mode === 'detail' && !order) return <Container><section className="checkout-section wrap">
    {detail.loading && <p role="status">Carregando pedido…</p>}
    {detail.error && <div role="alert"><p className="error">{detail.error}</p><button className="button outline" onClick={detail.retry}>Tentar novamente</button></div>}
    <Link className="detail-button" to="/pedidos">← Voltar aos pedidos</Link>
  </section></Container>;
  return <Container><section id="pedidos" className="checkout-section wrap" aria-labelledby={mode === 'orders' ? 'checkout-section-title' : 'checkout-title'}>
    {mode === 'orders' && <>
    <p className="eyebrow">AMBIENTE ACADÊMICO</p><h1 id="checkout-section-title">Meus pedidos</h1>
    <p>Nenhuma cobrança real. Frete gratuito na simulação. O estoque só é baixado após aprovação.</p>
    {orders.loading && <p role="status">Carregando seus pedidos…</p>}
    {orders.error && <p className="error" role="alert">{orders.error}</p>}
    <button className="detail-button" disabled={busy || orders.loading} onClick={orders.retry}>Atualizar pedidos</button>
    {orders.data?.length === 0 && <p>Você ainda não possui pedidos.</p>}
    <ul className="order-list">{orders.data?.map(item => <li key={item.id}>
      <strong>{item.number}</strong><span>{formatPrice(item.total)} · {statusLabel(item.status)}</span>
      <Link className="button outline" to={'/pedidos/' + encodeURIComponent(item.id)}>
        {item.status === 'AGUARDANDO_PAGAMENTO' ? 'Retomar pagamento' : 'Ver resumo'}
      </Link>
    </li>)}</ul>
    </>}
    {mode !== 'orders' && <div aria-busy={busy}>
      <Link className="detail-button" to={order ? '/pedidos' : '/carrinho'}>{order ? '← Meus pedidos' : '← Voltar ao carrinho'}</Link>
      <div className="checkout-content"><p className="eyebrow">SEM COBRANÇA REAL</p><h1 id="checkout-title">{order ? 'Resumo do pedido' : 'Finalizar pedido'}</h1>
        {error && <p role="alert" className="error">{error}</p>}
        {!order && <>
          <p>Subtotal: <strong>{formatPrice(cart?.total ?? '0.00')}</strong> · Frete: <strong>Grátis</strong></p>
          <p className="hint">Os valores e a disponibilidade serão conferidos novamente pelo servidor.</p>
          {addresses.loading && <p role="status">Carregando endereços…</p>}
          {addresses.error && <p role="alert" className="error">{addresses.error}</p>}
          <button className="detail-button" disabled={busy || addresses.loading} onClick={addresses.retry}>Atualizar endereços</button>
          <label className="checkout-label">Endereço de entrega<select disabled={busy} value={addressId} onChange={event => setAddressId(event.target.value)}>
            <option value="">Selecione um endereço</option>
            {addresses.data?.map(address => <option key={address.id} value={address.id}>{address.street}, {address.number} — {address.city}/{address.state}</option>)}
          </select></label>
          <AddressForm busy={busy} onSave={input => run(async () => {
            const address = await api.createAddress(input); setAddressId(address.id); addresses.retry();
          })} />
        </>}
        {order && <>
          <p className="order-number">{order.number}</p><p role="status">{statusLabel(order.status)}</p>
          <OrderProgress status={order.status} />
          {trackingError && <p role="status" className="error">{trackingError}</p>}
          <p className="hint">Atualização a cada 30 segundos com esta página visível. As etapas não representam rastreamento GPS.</p>
          <button className="detail-button" disabled={busy} onClick={() => { void run(async () => { setOrder(await api.order(order.id)); orders.retry(); }); }}>Atualizar acompanhamento</button>
          <ul>{order.items.map(item => <li key={item.productId}>{item.quantity} × {item.name} — {formatPrice(item.lineTotal)}</li>)}</ul>
          <p>Entrega: {order.address.recipient}, {order.address.street}, {order.address.number}{order.address.complement ? `, ${order.address.complement}` : ''} — {order.address.district}, {order.address.city}/{order.address.state}, CEP {order.address.postalCode}.</p>
          <p>Subtotal: {formatPrice(order.subtotal)} · Frete: {formatPrice(order.shipping)}</p>
          <p><strong>Total: {formatPrice(order.total)}</strong></p>
          {latest && <p role="status">Pagamento: {latest.status} · {latest.method}. {latest.reason}</p>}
          {order.cancellation && <CancellationSummary cancellation={order.cancellation} />}
          {canCancel(order.status) && <CancellationForm key={`${order.id}-${order.status}`} status={order.status} total={order.total} busy={busy}
            onConfirm={input => run(async () => {
              setOrder(await api.cancelOrder(order.id, input)); paymentRequest.current = null; orders.retry(); onChanged();
            })} />}
        </>}
        {(!order || showPayment) && <>
          <label className="checkout-label">Método simulado<select disabled={busy || Boolean(pending)} value={pending?.method ?? method} onChange={event => setMethod(event.target.value as PaymentMethod)}>
            <option value="PIX">PIX</option><option value="CARTAO">Cartão</option><option value="BOLETO">Boleto</option>
          </select></label>
          <p className="hint">Não informe dados bancários ou de cartão. Esta demonstração não gera PIX ou boleto real.</p>
          {showPayment ? <>
            <label className="checkout-label">Resultado da simulação<select disabled={busy} value={outcome} onChange={event => setOutcome(event.target.value as PaymentOutcome)}>
              <option value="APROVADO">Aprovar</option><option value="RECUSADO">Recusar</option><option value="FALHA">Simular falha</option>
            </select></label>
            <button className="button primary" disabled={busy} onClick={() => { void pay(); }}>{busy ? 'Processando…' : 'Executar pagamento simulado'}</button>
          </> : <button className="button primary" disabled={busy || !addressId || !cart?.items.length} onClick={() => { void createOrder(); }}>{busy ? 'Conferindo…' : 'Confirmar pedido e ir ao pagamento'}</button>}
        </>}
      </div>
    </div>}
  </section></Container>;
}
