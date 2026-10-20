import type { StorefrontApi, CatalogFilters, Product } from '../contracts/storefront';
import { errorMessage } from './error-message';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useResource } from './hooks/use-resource';
import { useSession } from './hooks/use-session';
import { useCart } from './hooks/use-cart';
import { Header, Hero, Footer } from './components/Layout';
import { Catalog } from './components/Catalog';
import { AuthDialog } from './components/AuthDialog';
import { ProductDetails } from './components/ProductDetails';
import { CartView } from './components/CartView';
import { CheckoutView } from './components/CheckoutView';
import { AdminPanel } from './components/AdminPanel';

export function App({ api }: { api: StorefrontApi }) {
  const session = useSession(api);
  const cart = useCart(api, session.user?.id ?? null, session.loading);
  const allProducts = useResource(api.products);
  const [filters, setFilters] = useState<CatalogFilters>({});
  const hasFilters = Object.values(filters).some(Boolean);
  const loadFiltered = useCallback((signal: AbortSignal) => hasFilters ? api.products(signal, filters) : Promise.resolve<Product[]>([]), [api, filters, hasFilters]);
  const filtered = useResource(loadFiltered);
  const products = hasFilters ? filtered : allProducts;
  const categories = useMemo(() => [...new Map((allProducts.data ?? []).map(product => [product.category_id, { id: product.category_id, name: product.category }])).values()]
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')), [allProducts.data]);
  const [authOpen, setAuthOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
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
  async function add(product: string) {
    if (await cart.add(product)) { setNotice('Produto adicionado ao carrinho.'); setProductId(null); }
    else setNotice('Não foi possível adicionar. Confira a mensagem no carrinho.');
  }
  return <>
    <Header user={session.user} loading={session.loading || cart.pending || checkoutOpen} cartCount={cart.data?.totalQuantity ?? 0} onLogin={() => setAuthOpen(true)} onLogout={logout} />
    <main>
      <Hero />
      <Catalog resource={products} onSelect={setProductId} categories={categories} onFilter={setFilters} filtered={hasFilters}
        onAdd={id => { void add(id); }} cartBusy={cart.busy || authOpen || checkoutOpen} />
      <CartView cart={cart} signedIn={Boolean(session.user)} onCheckout={() => session.user ? setCheckoutOpen(true) : setAuthOpen(true)} />
      {session.user && !session.loading && <CheckoutView key={session.user.id} api={api} cart={cart.data}
        open={checkoutOpen} onClose={() => setCheckoutOpen(false)} onChanged={() => { cart.retry(); allProducts.retry(); filtered.retry(); }} />}
      {session.user?.role === 'ADMIN' && !session.loading && <AdminPanel key={session.user.id} api={api}
        onChanged={() => { allProducts.retry(); filtered.retry(); cart.retry(); }} />}
      <Footer />
    </main>
    {authOpen && <AuthDialog authenticate={session.authenticate} onClose={() => setAuthOpen(false)} onSuccess={message => { setAuthOpen(false); setNotice(message); }} />}
    {productId && <ProductDetails key={productId} id={productId} api={api} onClose={() => setProductId(null)} onAdd={() => { void add(productId); }} cartBusy={cart.busy || authOpen} />}
    {notice && <div className="toast" role="status">{notice}</div>}
  </>;
}
