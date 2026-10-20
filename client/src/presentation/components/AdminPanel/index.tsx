import { Link } from 'react-router';
import { Container } from './styles';
import { useCallback, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { AdminApi, AdminProduct, AdminCategory, AdminOrder, ProductWrite, CategoryWrite } from '../../../contracts/admin';
import { useResource } from '../../hooks/use-resource';
import { errorMessage } from '../../error-message';
import { formatPrice } from '../../format-price';
import { nextStatus, orderSteps, statusLabel } from '../../order-status';
import { OrderProgress } from '../OrderProgress';
import { canCancel } from '../../../contracts/cancellation';
import type { CancellationInput } from '../../../contracts/cancellation';
import { CancellationForm, CancellationSummary } from '../Cancellation';

function Pagination({ page, total, pageSize, busy, onPage }: {
  page: number; total: number; pageSize: number; busy: boolean; onPage(page: number): void;
}) {
  return <div className="admin-pagination"><button className="button outline" disabled={busy || page <= 1} onClick={() => onPage(page - 1)}>Anterior</button>
    <span>Página {page} de {Math.max(1, Math.ceil(total / pageSize))} · {total} registro(s)</span>
    <button className="button outline" disabled={busy || page * pageSize >= total} onClick={() => onPage(page + 1)}>Próxima</button></div>;
}

function ProductForm({ product, categories, busy, onSave, onCancel }: {
  product: AdminProduct | null; categories: AdminCategory[]; busy: boolean;
  onSave(input: ProductWrite): void; onCancel(): void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    onSave({ name: String(fields.get('name')), description: String(fields.get('description')),
      categoryId: String(fields.get('categoryId')), price: String(fields.get('price')), weight: String(fields.get('weight')),
      image: String(fields.get('image')), active: fields.has('active'),
      ...(product ? { revision: product.revision } : { initialStock: Number(fields.get('initialStock')) }) });
  }
  return <form className="admin-form" onSubmit={submit}><fieldset disabled={busy}><legend>{product ? `Editar ${product.name}` : 'Novo produto'}</legend>
    <div className="admin-fields">
      <label>Nome<input name="name" maxLength={150} required defaultValue={product?.name ?? ''} /></label>
      <label>Categoria<select name="categoryId" required defaultValue={product?.categoryId ?? ''}>
        <option value="">Selecione</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}{category.active ? '' : ' (inativa)'}</option>)}
      </select></label>
      <label>Descrição<input name="description" maxLength={3000} defaultValue={product?.description ?? ''} /></label>
      <label>Preço (R$)<input name="price" type="number" min="0" max="9999999999.99" step="0.01" required defaultValue={product?.price ?? '0.00'} /></label>
      <label>Peso (gramas)<input name="weight" type="number" min="0" max="9999999.999" step="0.001" required defaultValue={product?.weight ?? '0.000'} /></label>
      <label>Imagem local ou HTTPS<input name="image" maxLength={2000} required defaultValue={product?.image ?? '/cupcake.svg'} /></label>
      {!product && <label>Estoque inicial<input name="initialStock" type="number" min="0" max="2147483647" step="1" required defaultValue="0" /></label>}
      <label className="admin-checkbox"><input name="active" type="checkbox" defaultChecked={product?.active ?? true} />Produto ativo</label>
    </div><div className="admin-actions"><button className="button primary" type="submit">Salvar produto</button><button className="button outline" type="button" onClick={onCancel}>Limpar / cancelar</button></div>
  </fieldset></form>;
}

function CategoryForm({ category, busy, onSave, onCancel }: {
  category: AdminCategory | null; busy: boolean; onSave(input: CategoryWrite): void; onCancel(): void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    onSave({ name: String(fields.get('name')), description: String(fields.get('description')) || null,
      active: fields.has('active'), ...(category ? { revision: category.revision } : {}) });
  }
  return <form className="admin-form" onSubmit={submit}><fieldset disabled={busy}><legend>{category ? `Editar ${category.name}` : 'Nova categoria'}</legend>
    <label>Nome da categoria<input name="name" maxLength={100} required defaultValue={category?.name ?? ''} /></label>
    <label>Descrição da categoria<input name="description" maxLength={2000} defaultValue={category?.description ?? ''} /></label>
    <label className="admin-checkbox"><input name="active" type="checkbox" defaultChecked={category?.active ?? true} />Categoria ativa</label>
    <div className="admin-actions"><button className="button primary" type="submit">Salvar categoria</button><button className="button outline" type="button" onClick={onCancel}>Limpar / cancelar</button></div>
  </fieldset></form>;
}

function StockForm({ product, busy, onSave, onCancel }: {
  product: AdminProduct; busy: boolean; onSave(delta: number, reason: string): void; onCancel(): void;
}) {
  return <form className="admin-form" onSubmit={event => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    onSave(Number(fields.get('delta')), String(fields.get('reason') ?? '').trim());
  }}><fieldset disabled={busy}><legend>Ajustar estoque de {product.name}</legend>
    <p>Estoque conferido: {product.stock}. O servidor rejeita o ajuste se esse valor mudar.</p>
    <p className="hint">O histórico é permanente. Confira as movimentações antes de repetir um ajuste com resposta incerta.</p>
    <label>Motivo do ajuste<input name="reason" minLength={5} maxLength={500} required /></label>
    <label>Variação de estoque (positiva para repor, negativa para corrigir)<input name="delta" type="number" step="1" min="-2147483647" max="2147483647" required /></label>
    <div className="admin-actions"><button className="button primary" type="submit">Aplicar ajuste</button><button className="button outline" type="button" onClick={onCancel}>Cancelar ajuste</button></div>
  </fieldset></form>;
}

function OrderCard({ order, busy, onAdvance, onCancel }: { order: AdminOrder; busy: boolean; onAdvance(status: string): void; onCancel(input: CancellationInput): Promise<void> }) {
  const next = nextStatus(order.status);
  return <article className="admin-order"><h3>{order.number}</h3><p>{order.customer.name} · {order.customer.email}</p>
    <p>{new Date(order.createdAt).toLocaleString('pt-BR')} · <strong>{formatPrice(order.total)}</strong></p>
    <OrderProgress status={order.status} />
    {order.cancellation && <CancellationSummary cancellation={order.cancellation} />}
    <details><summary>Itens, entrega e pagamentos</summary>
      <ul>{order.items.map(item => <li key={item.productId}>{item.quantity} × {item.name} — {formatPrice(item.lineTotal)}</li>)}</ul>
      <p>{order.address.recipient}: {order.address.street}, {order.address.number}{order.address.complement ? `, ${order.address.complement}` : ''} — {order.address.district}, {order.address.city}/{order.address.state}, CEP {order.address.postalCode}.</p>
      <ul>{order.payments.map(payment => <li key={payment.id}>{payment.method} · {payment.status} · {formatPrice(payment.amount)} (simulado)</li>)}</ul>
    </details>
    {next ? <button className="button primary" disabled={busy} onClick={() => onAdvance(next)}>Confirmar: {statusLabel(next)}</button>
      : <p className="hint">{order.status === 'AGUARDANDO_PAGAMENTO' ? 'Aguardando pagamento do cliente; o administrador não aprova pagamentos.' : 'Nenhum avanço disponível.'}</p>}
    {canCancel(order.status) && <details className="cancellation-details"><summary>Cancelar pedido / estorno simulado</summary>
      <CancellationForm status={order.status} total={order.total} busy={busy} onConfirm={onCancel} />
    </details>}
  </article>;
}

export function AdminPanel({ api, onChanged }: { api: AdminApi; onChanged(): void }) {
  const [tab, setTab] = useState('products');
  const [productPage, setProductPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [status, setStatus] = useState('');
  const loadCatalog = useCallback((signal: AbortSignal) => api.adminCatalog(productPage, signal), [api, productPage]);
  const loadOrders = useCallback((signal: AbortSignal) => api.adminOrders(orderPage, status, signal), [api, orderPage, status]);
  const catalog = useResource(loadCatalog);
  const orders = useResource(loadOrders);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [stockProduct, setStockProduct] = useState<AdminProduct | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const locked = useRef(false);
  const reset = () => { setEditingProduct(null); setEditingCategory(null); setStockProduct(null); setFormVersion(value => value + 1); };
  const refresh = () => { reset(); catalog.retry(); orders.retry(); };

  async function mutate(operation: () => Promise<unknown>, success: string) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setMessage(''); setError('');
    try { await operation(); setMessage(success); onChanged(); }
    catch (failure) { setError(`${errorMessage(failure)} Confira os dados atualizados antes de tentar novamente.`); }
    finally { refresh(); locked.current = false; setBusy(false); }
  }

  return <Container><section id="administracao" className="admin-section wrap" aria-labelledby="admin-title">
    <p className="eyebrow">ACESSO RESTRITO · ADMIN</p><h1 id="admin-title">Painel administrativo</h1>
    <p>Gerencie o catálogo e acompanhe as entregas. Não há cobranças ou integrações logísticas reais.</p>
    <p><Link className="button outline" to="/administracao/estoque">Histórico de movimentações de estoque ↗</Link></p>
    <div className="admin-actions" aria-label="Seções administrativas">
      <button className="button outline" aria-pressed={tab === 'products'} disabled={busy} onClick={() => setTab('products')}>Produtos e estoque</button>
      <button className="button outline" aria-pressed={tab === 'categories'} disabled={busy} onClick={() => setTab('categories')}>Categorias</button>
      <button className="button outline" aria-pressed={tab === 'orders'} disabled={busy} onClick={() => setTab('orders')}>Pedidos</button>
      <button className="detail-button" disabled={busy} onClick={refresh}>Atualizar painel</button>
    </div>
    {message && <p role="status">{message}</p>}{error && <p className="error" role="alert">{error}</p>}
    {catalog.error && <p className="error" role="alert">{catalog.error}</p>}{orders.error && <p className="error" role="alert">{orders.error}</p>}
    {tab !== 'orders' && catalog.loading && <p role="status">Carregando catálogo administrativo…</p>}
    {tab === 'products' && catalog.data && <>
      <ProductForm key={`${editingProduct?.id ?? 'new'}-${formVersion}`} product={editingProduct} categories={catalog.data.categories} busy={busy}
        onCancel={reset} onSave={input => { void mutate(() => api.saveProduct(editingProduct?.id ?? null, input), 'Produto salvo.'); }} />
      {stockProduct && <StockForm key={stockProduct.id} product={stockProduct} busy={busy} onCancel={() => setStockProduct(null)}
        onSave={(delta, reason) => { void mutate(() => api.adjustStock(stockProduct.id, { expectedStock: stockProduct.stock, delta, reason }), 'Estoque ajustado.'); }} />}
      <ul className="admin-list">{catalog.data.products.items.map(product => <li key={product.id}><div><strong>{product.name}</strong>
        <p>{formatPrice(product.price)} · {product.stock} unidade(s) · {product.active ? 'Ativo' : 'Inativo'}</p></div>
        <div className="admin-actions"><button className="button outline" disabled={busy} onClick={() => { setEditingProduct(product); setFormVersion(value => value + 1); }}>Editar produto</button>
          <button className="button outline" disabled={busy} onClick={() => setStockProduct(product)}>Ajustar estoque</button></div></li>)}</ul>
      {catalog.data.products.total === 0 && <p>Nenhum produto cadastrado.</p>}
      <Pagination {...catalog.data.products} busy={busy} onPage={page => { reset(); setProductPage(page); }} />
    </>}
    {tab === 'categories' && catalog.data && <>
      <CategoryForm key={`${editingCategory?.id ?? 'new'}-${formVersion}`} category={editingCategory} busy={busy} onCancel={reset}
        onSave={input => { void mutate(() => api.saveCategory(editingCategory?.id ?? null, input), 'Categoria salva.'); }} />
      <ul className="admin-list">{catalog.data.categories.map(category => <li key={category.id}><div><strong>{category.name}</strong><p>{category.active ? 'Ativa' : 'Inativa'}</p></div>
        <button className="button outline" disabled={busy} onClick={() => { setEditingCategory(category); setFormVersion(value => value + 1); }}>Editar categoria</button></li>)}</ul>
      <p className="hint">Para desativar uma categoria, desative antes seus produtos. Registros não são excluídos.</p>
    </>}
    {tab === 'orders' && <>
      <label className="admin-filter">Filtrar estado<select value={status} disabled={busy} onChange={event => { setStatus(event.target.value); setOrderPage(1); }}>
        <option value="">Todos</option>{[...orderSteps, { status: 'CANCELADO', label: 'Cancelado' }].map(step => <option key={step.status} value={step.status}>{step.label}</option>)}
      </select></label>
      {orders.loading && <p role="status">Carregando pedidos…</p>}
      {orders.data?.items.map(order => <OrderCard key={order.id} order={order} busy={busy}
        onAdvance={target => { void mutate(() => api.advanceOrder(order.id, { expectedStatus: order.status, status: target }), `Pedido atualizado: ${statusLabel(target)}.`); }}
        onCancel={input => mutate(() => api.adminCancelOrder(order.id, input), 'Cancelamento registrado; estorno e estoque tratados conforme o pagamento.')} />)}
      {orders.data?.total === 0 && <p>Nenhum pedido encontrado.</p>}
      {orders.data && <Pagination {...orders.data} busy={busy} onPage={setOrderPage} />}
    </>}
  </section></Container>;
}
