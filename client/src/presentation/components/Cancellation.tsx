import { useRef } from 'react';
import type { Cancellation, CancellationInput } from '../../contracts/cancellation';
import { formatPrice } from '../format-price';

export function CancellationForm({ status, total, busy, onConfirm }: {
  status: string; total: string; busy: boolean; onConfirm(input: CancellationInput): Promise<void>;
}) {
  const request = useRef<{ fingerprint: string; key: string } | null>(null);
  const paid = status !== 'AGUARDANDO_PAGAMENTO';
  return <form className="cancellation-form" onSubmit={event => {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    if (!fields.has('confirmed')) return;
    const reason = String(fields.get('reason') ?? '').trim();
    const fingerprint = JSON.stringify([status, reason]);
    if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, key: crypto.randomUUID() };
    void onConfirm({ reason, expectedStatus: status, idempotencyKey: request.current.key });
  }}><fieldset disabled={busy}><legend>Cancelar este pedido</legend>
    <p>{paid ? `Será registrado estorno simulado de ${formatPrice(total)} e o estoque será devolvido uma única vez.`
      : 'Pedido sem pagamento aprovado: não haverá estorno nem devolução de estoque, pois não houve baixa.'}</p>
    <p className="hint">Nenhum dinheiro real será movimentado. O pedido não poderá ser reativado; para comprar novamente, monte um novo carrinho.</p>
    <label>Motivo do cancelamento<input name="reason" required minLength={5} maxLength={500} /></label>
    <label className="cancellation-confirm"><input name="confirmed" type="checkbox" required />Confirmo que desejo cancelar este pedido.</label>
    <button className="button danger" type="submit">{busy ? 'Processando…' : paid ? 'Confirmar cancelamento e estorno simulado' : 'Confirmar cancelamento'}</button>
  </fieldset></form>;
}

export function CancellationSummary({ cancellation }: { cancellation: Cancellation }) {
  return <div className="cancellation-summary" role="status"><h3>Cancelamento registrado</h3>
    <p>Motivo: {cancellation.reason}</p>
    <p>{cancellation.actorRole === 'ADMIN' ? 'Administrador' : 'Cliente'} · usuário #{cancellation.actorId} · {new Date(cancellation.createdAt).toLocaleString('pt-BR')}</p>
    <p>{cancellation.refundStatus === 'SIMULADO' ? `Estorno simulado concluído: ${formatPrice(cancellation.refundAmount)}.` : 'Estorno não aplicável: nenhum pagamento havia sido aprovado.'}</p>
    {cancellation.refundedAt && <p>Estorno registrado em {new Date(cancellation.refundedAt).toLocaleString('pt-BR')}.</p>}
    <p>{cancellation.stockRestored ? 'Estoque devolvido integralmente, uma única vez.' : 'Nenhuma devolução de estoque necessária.'}</p>
    <p className="hint">Registro acadêmico, sem movimentação financeira real. O histórico original dos pagamentos foi preservado.</p>
  </div>;
}
