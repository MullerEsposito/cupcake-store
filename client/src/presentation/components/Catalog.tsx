import type { Product, Resource, CatalogFilters as Filters } from '../../contracts/storefront';
import { ProductImage } from './ProductImage';
import { formatPrice } from '../format-price';

import { CatalogFilters } from './CatalogFilters';

export function Catalog({ resource, onSelect, categories, onFilter, filtered, onAdd, cartBusy }: {
  resource: Resource<Product[]>; onSelect(id: string): void;
  categories: { id: string; name: string }[]; onFilter(filters: Filters): void;
  filtered: boolean; onAdd(id: string): void; cartBusy: boolean;
}) {
  const { data: products, loading, error, retry } = resource;
  return <section id="catalogo" className="catalog wrap" aria-labelledby="catalog-title">
    <div className="section-top"><div><p className="eyebrow">ESCOLHA SEU MOMENTO DOCE</p><h2 id="catalog-title">Nossos cupcakes</h2></div><span className="catalog-note">Do primeiro olhar à última mordida.</span></div>
    <CatalogFilters categories={categories} onApply={onFilter} />
    {!loading && !error && <p role="status">{products?.length ?? 0} produto(s) encontrado(s).</p>}
    {loading && <div className="state" role="status">Preparando a vitrine…</div>}
    {error && <div className="state" role="alert"><p>{error}</p><button className="button outline" onClick={retry}>Tentar novamente</button></div>}
    {!loading && !error && !products?.length && <div className="state" role="status">{filtered ? 'Nenhum produto encontrado para os filtros. Tente outros termos ou limpe os filtros.' : 'Nossa vitrine está sendo preparada. Nenhum produto ativo cadastrado no momento.'}</div>}
    <div className="products" aria-live="polite">{products?.map(product => <article className="product" key={product.id}>
      <ProductImage product={product} className="product-image" />
      <div className="product-content"><p className="category">{product.category}</p><h3>{product.name}</h3><p className="product-description">{product.description}</p>
        <div className="product-bottom"><span className="price">{formatPrice(product.price)}</span><button className="detail-button" onClick={() => onSelect(product.id)} aria-label={`Ver detalhes de ${product.name}`}>Ver detalhes ↗</button></div>
        <button className="button primary" type="button" disabled={cartBusy || Number(product.stock) <= 0} onClick={() => onAdd(product.id)} aria-label={`Adicionar ${product.name} ao carrinho`}>Adicionar ao carrinho</button>
        <p className="stock">{Number(product.stock) > 0 ? 'Disponível' : 'Temporariamente esgotado'}</p>
      </div>
    </article>)}</div>
  </section>;
}
