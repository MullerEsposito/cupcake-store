import type { StorefrontApi } from '../contracts/storefront';
import { errorMessage } from './error-message';
import { useState, useEffect } from 'react';
import { useResource } from './hooks/use-resource';
import { useSession } from './hooks/use-session';
import { Header, Hero, Footer } from './components/Layout';
import { Catalog } from './components/Catalog';
import { AuthDialog } from './components/AuthDialog';
import { ProductDetails } from './components/ProductDetails';

export function App({ api }: { api: StorefrontApi }) {
  const session = useSession(api);
  const products = useResource(api.products);
  const [authOpen, setAuthOpen] = useState(false);
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
  return <>
    <Header user={session.user} loading={session.loading} onLogin={() => setAuthOpen(true)} onLogout={logout} />
    <main>
      <Hero />
      <Catalog resource={products} onSelect={setProductId} />
      <Footer />
    </main>
    {authOpen && <AuthDialog authenticate={session.authenticate} onClose={() => setAuthOpen(false)} onSuccess={message => { setAuthOpen(false); setNotice(message); }} />}
    {productId && <ProductDetails key={productId} id={productId} api={api} onClose={() => setProductId(null)} />}
    {notice && <div className="toast" role="status">{notice}</div>}
  </>;
}
