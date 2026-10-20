import { CheckoutView } from '../../components/CheckoutView';
import { useStorefront } from '../../StorefrontContext';

export function OrdersPage() {
  const { api, refresh } = useStorefront();
  return <CheckoutView api={api} cart={null} mode="orders" onChanged={refresh} />;
}
