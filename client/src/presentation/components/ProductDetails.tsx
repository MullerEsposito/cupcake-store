import type { StorefrontApi } from '../../contracts/storefront';
import { useCallback } from 'react';
import { useResource } from '../hooks/use-resource';
import { Modal } from './Modal';
import { ProductImage } from './ProductImage';
import { formatPrice } from '../format-price';

export function ProductDetails({ id, api, onClose }: { id: string; api: StorefrontApi; onClose(): void }) {
  const load = useCallback((signal: AbortSignal) => api.product(id, signal), [api, id]);
  const { data: product, loading, error, retry } = useResource(load);
  return <Modal titleId="product-title" onClose={onClose}>
    <h2 id="product-title">{product?.name || 'Detalhes do produto'}</h2>
    {loading && <p role="status">Carregando os detalhes…</p>}
    {error && <><p className="error" role="alert">{error}</p><button className="button outline" onClick={retry}>Tentar novamente</button></>}
    {product && <><ProductImage product={product} className="detail-image" /><p className="category">{product.category}</p>
      <p className="detail-info">{product.description}</p><p className="detail-price">{formatPrice(product.price)}</p>
      <p className="hint">Peso: {Number(product.weight)} g · {Number(product.stock) > 0 ? 'Disponível' : 'Temporariamente esgotado'}</p>
      <p className="hint">Compras serão disponibilizadas na próxima etapa do projeto.</p></>}
  </Modal>;
}
