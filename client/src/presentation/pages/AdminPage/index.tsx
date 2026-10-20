import { AdminPanel } from '../../components/AdminPanel';
import { useStorefront } from '../../StorefrontContext';

export function AdminPage() {
  const { api, refresh } = useStorefront();
  return <AdminPanel api={api} onChanged={refresh} />;
}
