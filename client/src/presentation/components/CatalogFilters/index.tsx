import { FilterForm } from './styles';
import type { CatalogFilters as Filters } from '../../../contracts/storefront';
import { useState } from 'react';

export function CatalogFilters({ categories, onApply, filters }: {
  categories: { id: string; name: string }[]; onApply(filters: Filters): void; filters: Filters;
}) {
  const [draft, setDraft] = useState({ q: filters.q ?? '', category: filters.category ?? '', minPrice: filters.minPrice ?? '', maxPrice: filters.maxPrice ?? '' });
  return <FilterForm className="catalog-filters" aria-label="Buscar e filtrar produtos" onSubmit={event => { event.preventDefault(); onApply(draft); }}>
    <label>Buscar por nome ou descrição<input type="search" maxLength={100} value={draft.q} placeholder="Chocolate, frutas…" onChange={event => setDraft({ ...draft, q: event.target.value })} /></label>
    <label>Categoria<select value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}>
      <option value="">Todas</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
    </select></label>
    <label>Preço mínimo (R$)<input type="number" min="0" max="9999999999.99" step="0.01" value={draft.minPrice} onChange={event => setDraft({ ...draft, minPrice: event.target.value })} /></label>
    <label>Preço máximo (R$)<input type="number" min="0" max="9999999999.99" step="0.01" value={draft.maxPrice} onChange={event => setDraft({ ...draft, maxPrice: event.target.value })} /></label>
    <button className="button primary" type="submit">Buscar</button>
    <button className="button outline" type="button" onClick={() => { setDraft({ q: '', category: '', minPrice: '', maxPrice: '' }); onApply({}); }}>Limpar filtros</button>
  </FilterForm>;
}
