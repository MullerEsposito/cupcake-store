import type { PublicUser } from '../../contracts/storefront';
import type { ReactNode } from 'react';
import { Navigate, Link, useLocation } from 'react-router';
import { useStorefront } from '../StorefrontContext';

export function RequireSession({ admin = false, children }: { admin?: boolean; children: ReactNode }) {
  const { session } = useStorefront();
  return <SessionAccess user={session.user} loading={session.loading} admin={admin}>{children}</SessionAccess>;
}

export function SessionAccess({ user, loading, admin = false, children }: { user: PublicUser | null; loading: boolean; admin?: boolean; children: ReactNode }) {
  const location = useLocation();
  if (loading) return <div className="state wrap" role="status">Verificando sua sessão…</div>;
  if (!user) return <Navigate to="/entrar" replace state={{ returnTo: location.pathname + location.search }} />;
  if (admin && user.role !== 'ADMIN') return <section className="state wrap"><h1>Acesso restrito</h1><p>Esta página é exclusiva para administradores.</p><Link className="button outline" to="/produtos">Voltar ao catálogo</Link></section>;
  return children;
}

export function safeReturnTo(value: unknown): string {
  return typeof value === 'string' && /^\/(?!\/)/.test(value) && !/[\\\u0000-\u001f\u007f]/.test(value) && !/^\/(entrar|cadastro)(\/|\?|$)/.test(value) ? value : '/carrinho';
}
