import { Catalog } from '../../components/Catalog';
import { useStorefront } from '../../StorefrontContext';

export function CatalogPage() {
  const { products, categories, setFilters, filters, hasFilters, add, cart } = useStorefront();
  return <Catalog resource={products} categories={categories} onFilter={setFilters} filters={filters} filtered={hasFilters} onAdd={id => { void add(id); }} cartBusy={cart.busy} />;
}
