import type { StorefrontApi, PublicUser, AuthMode, AuthInput } from '../../contracts/storefront';
import { useEffect, useState } from 'react';

export function useSession(api: StorefrontApi) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    api.session(controller.signal).then(value => { if (active) setUser(value); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [api]);
  async function authenticate(mode: AuthMode, input: AuthInput) {
    const result = await (mode === 'register' ? api.register(input) : api.login(input));
    setUser(result);
  }
  async function logout() { await api.logout(); setUser(null); }
  return { user, loading, authenticate, logout };
}
