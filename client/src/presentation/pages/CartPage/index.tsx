import { Link, useNavigate } from 'react-router';
import { CartView } from '../../components/CartView';
import { useStorefront } from '../../StorefrontContext';

export function CartPage() {
  const { cart, session } = useStorefront();
  const navigate = useNavigate();
  return <><CartView cart={cart} signedIn={Boolean(session.user)} onCheckout={() => navigate('/checkout')} /><p className="wrap"><Link className="detail-button" to="/produtos">← Continuar comprando</Link></p></>;
}
