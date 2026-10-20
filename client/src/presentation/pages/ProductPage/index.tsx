import { Link, useParams } from 'react-router';
import { ProductDetails } from '../../components/ProductDetails';
import { useStorefront } from '../../StorefrontContext';

export function ProductPage() {
  const { id = '' } = useParams();
  const { api, add, cart } = useStorefront();
  return <><div className="wrap"><Link className="detail-button" to="/produtos">← Voltar ao catálogo</Link></div><ProductDetails key={id} id={id} api={api} onAdd={() => { void add(id); }} cartBusy={cart.busy} /></>;
}
