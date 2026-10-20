import { InventoryHistory } from '../../components/InventoryHistory';
import { useStorefront } from '../../StorefrontContext';

export function InventoryPage() {
  const { api } = useStorefront();
  return <InventoryHistory api={api} />;
}
