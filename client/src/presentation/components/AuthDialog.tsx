import type { ChangeEvent, FormEvent } from 'react';
import type { Authenticate, AuthMode } from '../../contracts/storefront';
import { errorMessage } from '../error-message';

import { useState } from 'react';
import { Modal } from './Modal';

export function AuthDialog({ authenticate, onSuccess, onClose }: {
  authenticate: Authenticate; onSuccess(message: string): void; onClose(): void;
}) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [fields, setFields] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const registering = mode === 'register';
  function changeMode(value: AuthMode) { setMode(value); setError(''); }
  function changeField(event: ChangeEvent<HTMLInputElement>) { setFields(current => ({ ...current, [event.target.name]: event.target.value })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try { await authenticate(mode, fields); onSuccess(registering ? 'Sua conta foi criada. Bem-vindo!' : 'Você entrou na sua conta.'); }
    catch (failure) { setError(errorMessage(failure)); setBusy(false); }
  }
  return (
  <Modal titleId="auth-title" onClose={onClose} busy={busy}>
    <p className="eyebrow">BEM-VINDO À CUPCAKE STORE</p>
    <h2 id="auth-title">Que bom ter você aqui.</h2>
    <p>{registering ? 'Seu cadastro começa com nome, e-mail e senha.' : 'Entre para acessar sua conta.'}</p>
    <div className="tabs" role="group" aria-label="Acesso à conta">
      <button type="button" aria-pressed={!registering} disabled={busy} onClick={() => changeMode('login')}>Entrar</button>
      <button type="button" aria-pressed={registering} disabled={busy} onClick={() => changeMode('register')}>Criar conta</button>
    </div>
    <form onSubmit={submit} aria-busy={busy}>
      {registering && <label>Seu nome<input name="name" autoComplete="name" minLength={2} maxLength={150} required value={fields.name} onChange={changeField} disabled={busy} /></label>}
      <label>E-mail<input name="email" type="email" autoComplete="email" maxLength={254} required value={fields.email} onChange={changeField} disabled={busy} /></label>
      <label>Senha<input name="password" type="password" autoComplete={registering ? 'new-password' : 'current-password'} minLength={registering ? 12 : 1} maxLength={128} required value={fields.password} onChange={changeField} disabled={busy} /></label>
      {registering && <p className="hint">Use entre 12 e 128 caracteres para proteger sua conta.</p>}
      <p className="error" role="alert">{error}</p><button className="button primary" type="submit" disabled={busy}>{busy ? 'Aguarde…' : registering ? 'Criar minha conta' : 'Entrar na minha conta'}</button>
    </form>
  </Modal>)
}
