import { Container } from './styles';
import type { StorefrontApi } from '../../../contracts/storefront';
import { useCallback } from 'react';
import { useResource } from '../../hooks/use-resource';
import { ProductImage } from '../ProductImage';
import { formatPrice } from '../../format-price';

export function productStockLabel(stock: number): string {
  if (stock <= 0) return 'Temporariamente esgotado';
  if (stock === 1) return 'Última unidade';
  if (stock < 5) return `Últimos ${stock}`;
  return 'Disponível';
}

export function ProductDetails({ id, api, onAdd, cartBusy }: { id: string; api: StorefrontApi; onAdd(): void; cartBusy: boolean }) {
  const load = useCallback((signal: AbortSignal) => api.product(id, signal), [api, id]);
  const { data: product, loading, error, retry } = useResource(load);
  return <Container><section className="product-details wrap" aria-labelledby="product-title">
    <h1 id="product-title">{product?.name || 'Detalhes do produto'}</h1>
    {loading && <p role="status">Carregando os detalhes…</p>}
    {error && <><p className="error" role="alert">{error}</p><button className="button outline" onClick={retry}>Tentar novamente</button></>}
    {product && <><ProductImage product={product} className="detail-image" /><p className="category">{product.category}</p>
      <p className="detail-info">{product.description}</p><p className="detail-price">{formatPrice(product.price)}</p>
      <p className="product-meta"><span className="hint">Peso: {Number(product.weight)} g</span>
        <strong className="stock-badge" data-stock={product.stock <= 0 ? 'sold-out' : product.stock === 1 ? 'last' : product.stock < 5 ? 'low' : 'available'}>
          <span aria-hidden="true" className="stock-dot" />{productStockLabel(Number(product.stock))}
        </strong>
      </p>
      <button className="button primary" disabled={cartBusy || Number(product.stock) <= 0} onClick={onAdd}>Adicionar ao carrinho</button><p className="hint">Adicionar não reserva estoque nem conclui uma compra.</p></>}
  </section></Container>;
}
