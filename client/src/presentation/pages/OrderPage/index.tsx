import { useParams } from 'react-router';
import { CheckoutView } from '../../components/CheckoutView';
import { useStorefront } from '../../StorefrontContext';

export function OrderPage() {
  const { id = '' } = useParams();
  const { api, refresh } = useStorefront();
  return <CheckoutView key={id} api={api} cart={null} mode="detail" orderId={id} onChanged={refresh} />;
}
