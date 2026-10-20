import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import type { AdminApi } from '../../../contracts/admin';
import type { InventoryFilter, StockMovement } from '../../../contracts/inventory';
import { movementLabels } from '../../../contracts/inventory';
import { useResource } from '../../hooks/use-resource';
import { Container, Filters, MovementCard, Pagination } from './styles';

export function MovementSummary({ movement }: { movement: StockMovement }) {
  return <MovementCard aria-label={`Movimentação #${movement.id}`}>
    <header><div><p className="eyebrow">{movementLabels[movement.type]}</p><h2>{movement.productName}</h2><p className="hint">Produto #{movement.productId} · Registro #{movement.id}</p></div>
      <strong className={movement.quantity < 0 ? 'outgoing' : 'incoming'}>{movement.quantity > 0 ? '+' : ''}{movement.quantity} un.</strong></header>
    <dl><div><dt>Saldo anterior</dt><dd>{movement.previousStock}</dd></div><div><dt>Saldo posterior</dt><dd>{movement.currentStock}</dd></div></dl>
    <p><strong>Motivo:</strong> {movement.reason}</p>
    <p>{new Date(movement.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · Brasília</p>
    <p className="hint">{movement.origin === 'SISTEMA' ? 'Execução automática pelo sistema' : 'Operação administrativa'} ·
      {movement.actorId ? ` Autor: ${movement.actorRole} #${movement.actorId}` : ' Implantação/abertura sem autor individual'}</p>
    {movement.orderId && <p className="hint">Pedido #{movement.orderId} · Pagamento #{movement.paymentId}{movement.cancellationId ? ` · Cancelamento #${movement.cancellationId}` : ''}</p>}
  </MovementCard>;
}

export function InventoryHistory({ api }: { api: AdminApi }) {
  const [filters, setFilters] = useState<InventoryFilter>({});
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const load = useCallback((signal: AbortSignal) => api.stockMovements(page, filters, signal), [api, page, filters]);
  const resource = useResource(load);
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setFilters(Object.fromEntries([...fields.entries()].map(([key, value]) => [key, String(value).trim()]).filter(([, value]) => value)));
    setPage(1);
  }
  return <Container className="wrap" aria-labelledby="inventory-title">
    <Link className="detail-button" to="/administracao">← Voltar à administração</Link>
    <p className="eyebrow">ACESSO RESTRITO · ADMIN</p><h1 id="inventory-title">Histórico de estoque</h1>
    <p>Entradas, saídas e responsáveis por cada movimentação. Registros permanentes, sem edição ou exclusão.</p>
    <p className="hint">A abertura registra o saldo observado, sem reconstruir operações anteriores. Vendas e devoluções são simulações acadêmicas.</p>
    <Filters key={version} onSubmit={apply} aria-label="Filtrar movimentações">
      <label>ID do produto<input name="productId" type="text" inputMode="numeric" pattern="[1-9][0-9]{0,18}" maxLength={19} /></label>
      <label>Tipo<select name="type"><option value="">Todos</option>{Object.entries(movementLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Data inicial<input name="from" type="date" /></label><label>Data final<input name="to" type="date" /></label>
      <label>ID do usuário responsável<input name="actorId" type="text" inputMode="numeric" pattern="[1-9][0-9]{0,18}" maxLength={19} /></label>
      <label>ID do pedido<input name="orderId" type="text" inputMode="numeric" pattern="[1-9][0-9]{0,18}" maxLength={19} /></label>
      <button className="button primary" type="submit">Aplicar filtros</button>
      <button className="button outline" type="button" onClick={() => { setFilters({}); setPage(1); setVersion(value => value + 1); }}>Limpar filtros</button>
    </Filters>
    <p className="hint">Período inclusivo no fuso de Brasília (America/Sao_Paulo). Para filtrar, utilize os IDs exibidos nos registros.</p>
    <button className="detail-button" disabled={resource.loading} onClick={resource.retry}>Atualizar histórico</button>
    {resource.loading && <p role="status">Carregando movimentações…</p>}
    {resource.error && <p className="error" role="alert">{resource.error}</p>}
    {resource.data && <><p role="status">{resource.data.total} movimentação(ões) encontrada(s).</p>
      {resource.data.items.length ? resource.data.items.map(movement => <MovementSummary key={movement.id} movement={movement} />)
        : <div className="state">Nenhuma movimentação encontrada para este período ou filtro.</div>}
      <Pagination aria-label="Paginação do histórico"><button className="button outline" disabled={resource.loading || page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button>
        <span>Página {page} de {Math.max(1, Math.ceil(resource.data.total / resource.data.pageSize))}</span>
        <button className="button outline" disabled={resource.loading || page * resource.data.pageSize >= resource.data.total} onClick={() => setPage(value => value + 1)}>Próxima</button></Pagination>
    </>}
  </Container>;
}
