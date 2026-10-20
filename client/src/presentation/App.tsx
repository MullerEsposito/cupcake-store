import type { StorefrontApi } from '../contracts/storefront';
import { Routes, Route } from 'react-router';
import { StorefrontProvider, useStorefront } from './StorefrontContext';
import { Header, Footer } from './components/Layout';
import { Shell } from './components/Layout/styles';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { CatalogPage } from './pages/CatalogPage';
import { ProductPage } from './pages/ProductPage';
import { CartPage } from './pages/CartPage';
import { AuthPage } from './pages/AuthPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderPage } from './pages/OrderPage';
import { InventoryPage } from './pages/InventoryPage';
import { AdminPage } from './pages/AdminPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RequireSession } from './routes/RequireSession';
import { PageNavigation } from './routes/PageNavigation';

function StorefrontRoutes() {
  const { session, cart, logout, notice } = useStorefront();
  return <Shell>
    <PageNavigation />
    <Header user={session.user} loading={session.loading || cart.pending} cartCount={cart.data?.totalQuantity ?? 0} onLogout={() => { void logout(); }} />
    <main id="conteudo" tabIndex={-1}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/produtos" element={<CatalogPage />} />
        <Route path="/produtos/:id" element={<ProductPage />} />
        <Route path="/sobre" element={<AboutPage />} />
        <Route path="/carrinho" element={<CartPage />} />
        <Route path="/entrar" element={<AuthPage />} />
        <Route path="/checkout" element={<RequireSession><CheckoutPage /></RequireSession>} />
        <Route path="/pedidos" element={<RequireSession><OrdersPage /></RequireSession>} />
        <Route path="/pedidos/:id" element={<RequireSession><OrderPage /></RequireSession>} />
        <Route path="/administracao/estoque" element={<RequireSession admin><InventoryPage /></RequireSession>} />
        <Route path="/administracao" element={<RequireSession admin><AdminPage /></RequireSession>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </main>
    <Footer />
    {notice && <div className="toast" role="status">{notice}</div>}
  </Shell>;
}

export function App({ api }: { api: StorefrontApi }) {
  return <StorefrontProvider api={api}><StorefrontRoutes /></StorefrontProvider>;
}
