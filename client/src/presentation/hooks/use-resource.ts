import type { Resource } from '../../contracts/storefront';
import { errorMessage } from '../error-message';
import { useEffect, useState, useCallback } from 'react';

export function useResource<T>(load: (signal: AbortSignal) => Promise<T>): Resource<T> {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<Omit<Resource<T>, 'retry'>>({ data: null, error: '', loading: true });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState({ data: null, error: '', loading: true });
    Promise.resolve().then(() => load(controller.signal)).then(data => {
      if (active) setState({ data, error: '', loading: false });
    }).catch((error: unknown) => {
      if (active && !(error instanceof Error && error.name === 'AbortError')) setState({ data: null, error: errorMessage(error), loading: false });
    });
    return () => { active = false; controller.abort(); };
  }, [load, version]);
  const retry = useCallback(() => setVersion(value => value + 1), []);
  return { ...state, retry };
}
