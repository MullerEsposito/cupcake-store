import { useCallback, useEffect, useRef, useState } from 'react';
import type { Cart, StorefrontApi } from '../../contracts/storefront';
import { errorMessage } from '../error-message';

export function useCart(api: StorefrontApi, userId: string | null, sessionLoading: boolean) {
  const owner = userId ?? 'guest';
  const generation = useRef(0);
  const locked = useRef(false);
  const mergeRequest = useRef<{ owner: string; operation: Promise<Cart> } | null>(null);
  const [version, setVersion] = useState(0);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<{ owner: string; data: Cart | null; error: string; loading: boolean }>({ owner, data: null, error: '', loading: true });
  useEffect(() => {
    const current = ++generation.current;
    const controller = new AbortController();
    locked.current = false;
    setPending(false);
    setState({ owner, data: null, error: '', loading: true });
    if (sessionLoading) return () => { generation.current++; controller.abort(); };
    if (!userId) mergeRequest.current = null;
    if (userId && mergeRequest.current?.owner !== owner) mergeRequest.current = { owner, operation: api.mergeCart() };
    const operation = userId ? mergeRequest.current!.operation : api.cart(controller.signal);
    operation.then(data => {
      if (generation.current === current) setState({ owner, data, error: '', loading: false });
    }).catch((error: unknown) => {
      if (generation.current === current) setState({ owner, data: null, error: errorMessage(error), loading: false });
    });
    return () => { generation.current++; controller.abort(); };
  }, [api, owner, userId, sessionLoading, version]);

  const data = state.owner === owner && !sessionLoading ? state.data : null;
  const busy = pending || sessionLoading || state.loading || !data;
  async function mutate(operation: () => Promise<Cart>): Promise<boolean> {
    if (locked.current || busy) return false;
    locked.current = true;
    setPending(true);
    const current = generation.current;
    try {
      const result = await operation();
      if (generation.current !== current) return false;
      setState({ owner, data: result, error: '', loading: false });
      return true;
    } catch (error) {
      if (generation.current === current) setState(previous => ({ ...previous, error: errorMessage(error) }));
      return false;
    } finally {
      if (generation.current === current) { locked.current = false; setPending(false); }
    }
  }
  return {
    data, busy, pending, loading: sessionLoading || state.owner !== owner || state.loading,
    error: state.owner === owner ? state.error : '',
    retry: useCallback(() => { mergeRequest.current = null; setVersion(value => value + 1); }, []),
    add: (productId: string) => mutate(() => api.addCartItem(productId, 1)),
    setQuantity: (productId: string, quantity: number) => mutate(() => api.setCartQuantity(productId, quantity)),
    remove: (productId: string) => mutate(() => api.removeCartItem(productId))
  };
}
