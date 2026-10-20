import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { safeReturnTo } from '../../routes/RequireSession';
import { AuthForm } from '../../components/AuthForm';
import { useStorefront } from '../../StorefrontContext';

export function AuthPage() {
  const { session, setNotice } = useStorefront();
  const location = useLocation();
  const navigate = useNavigate();
  const [initializing] = useState(session.loading);
  const [authenticating, setAuthenticating] = useState(false);
  const returnTo = safeReturnTo((location.state as { returnTo?: unknown } | null)?.returnTo);
  if (initializing && session.loading && !authenticating) return <p className="state wrap" role="status">Verificando sua sessão…</p>;
  if (session.user) return <section className="state wrap"><h1>Você já está conectado.</h1><Link className="button primary" to={returnTo}>Continuar</Link></section>;
  return <AuthForm authenticate={async (mode, fields) => { setAuthenticating(true); try { await session.authenticate(mode, fields); } finally { setAuthenticating(false); } }} onSuccess={message => { setNotice(message); navigate(returnTo, { replace: true }); }} />;
}
