import { useNavigate } from 'react-router';
import { Catalog } from '../../components/Catalog';
import { useStorefront } from '../../StorefrontContext';

export function CatalogPage() {
  const { products, categories, setFilters, filters, hasFilters, add, cart } = useStorefront();
  const navigate = useNavigate();
  return <Catalog resource={products} onSelect={id => navigate('/produtos/' + encodeURIComponent(id))} categories={categories} onFilter={setFilters} filters={filters} filtered={hasFilters} onAdd={id => { void add(id); }} cartBusy={cart.busy} />;
}
