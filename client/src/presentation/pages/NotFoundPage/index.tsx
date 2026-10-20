import { Link } from 'react-router';

export function NotFoundPage() {
  return <section className="state wrap"><h1>Página não encontrada</h1><p>Este endereço não faz parte da nossa loja.</p><Link className="button primary" to="/produtos">Ir ao catálogo</Link></section>;
}
