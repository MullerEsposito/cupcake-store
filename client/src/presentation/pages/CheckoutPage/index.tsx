import { Link } from 'react-router';
import { CheckoutView } from '../../components/CheckoutView';
import { useStorefront } from '../../StorefrontContext';

export function CheckoutPage() {
  const { api, cart, refresh } = useStorefront();
  if (cart.loading || cart.pending) return <p className="state wrap" role="status">Conferindo seu carrinho…</p>;
  if (cart.error) return <div className="state wrap" role="alert"><p>{cart.error}</p><button className="button outline" onClick={cart.retry}>Tentar novamente</button></div>;
  if (!cart.data?.items.length) return <section className="state wrap"><h1>Seu carrinho está vazio.</h1><Link className="button primary" to="/produtos">Escolher cupcakes</Link></section>;
  return <CheckoutView api={api} cart={cart.data} mode="checkout" onChanged={refresh} />;
}
