import { Container } from './styles';
import type { StorefrontApi } from '../../../contracts/storefront';
import { useCallback } from 'react';
import { useResource } from '../../hooks/use-resource';
import { ProductImage } from '../ProductImage';
import { formatPrice } from '../../format-price';

export function ProductDetails({ id, api, onAdd, cartBusy }: { id: string; api: StorefrontApi; onAdd(): void; cartBusy: boolean }) {
  const load = useCallback((signal: AbortSignal) => api.product(id, signal), [api, id]);
  const { data: product, loading, error, retry } = useResource(load);
  return <Container><section className="product-details wrap" aria-labelledby="product-title">
    <h1 id="product-title">{product?.name || 'Detalhes do produto'}</h1>
    {loading && <p role="status">Carregando os detalhes…</p>}
    {error && <><p className="error" role="alert">{error}</p><button className="button outline" onClick={retry}>Tentar novamente</button></>}
    {product && <><ProductImage product={product} className="detail-image" /><p className="category">{product.category}</p>
      <p className="detail-info">{product.description}</p><p className="detail-price">{formatPrice(product.price)}</p>
      <p className="hint">Peso: {Number(product.weight)} g · {Number(product.stock) > 0 ? 'Disponível' : 'Temporariamente esgotado'}</p>
      <button className="button primary" disabled={cartBusy || Number(product.stock) <= 0} onClick={onAdd}>Adicionar ao carrinho</button><p className="hint">Adicionar não reserva estoque nem conclui uma compra.</p></>}
  </section></Container>;
}
