import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { StorefrontApi, CatalogFilters, Product } from '../contracts/storefront';
import { useSession } from './hooks/use-session';
import { useCart } from './hooks/use-cart';
import { useResource } from './hooks/use-resource';
import { errorMessage } from './error-message';

function useStorefrontState(api: StorefrontApi) {
  const session = useSession(api);
  const cart = useCart(api, session.user?.id ?? null, session.loading);
  const allProducts = useResource(api.products);
  const [filters, setFilters] = useState<CatalogFilters>({});
  const hasFilters = Object.values(filters).some(Boolean);
  const loadFiltered = useCallback((signal: AbortSignal) => hasFilters ? api.products(signal, filters) : Promise.resolve<Product[]>([]), [api, filters, hasFilters]);
  const filtered = useResource(loadFiltered);
  const categories = useMemo(() => [...new Map((allProducts.data ?? []).map(product => [product.category_id, { id: product.category_id, name: product.category }])).values()]
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')), [allProducts.data]);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  async function logout() {
    try { await session.logout(); setNotice('Você saiu da sua conta.'); }
    catch (error) { setNotice(errorMessage(error)); }
  }
  async function add(id: string) {
    const added = await cart.add(id);
    setNotice(added ? 'Produto adicionado ao carrinho.' : 'Não foi possível adicionar. Confira a mensagem no carrinho.');
  }
  const refresh = () => { cart.retry(); allProducts.retry(); filtered.retry(); };
  return { api, session, cart, allProducts, products: hasFilters ? filtered : allProducts, filters, setFilters, hasFilters, categories, notice, setNotice, logout, add, refresh };
}

const StorefrontContext = createContext<ReturnType<typeof useStorefrontState> | null>(null);

export function StorefrontProvider({ api, children }: { api: StorefrontApi; children: ReactNode }) {
  const value = useStorefrontState(api);
  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront() {
  const context = useContext(StorefrontContext);
  if (!context) throw new Error('StorefrontProvider não encontrado.');
  return context;
}
