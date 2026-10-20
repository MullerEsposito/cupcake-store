import type { AxiosAdapter } from 'axios';
import axios from 'axios';

function normalizeError(error: unknown): Promise<never> {
  if (axios.isCancel(error)) {
    const canceled = new Error('Solicitação cancelada.');
    canceled.name = 'AbortError';
    return Promise.reject(canceled);
  }
  const failure = axios.isAxiosError<{ error?: unknown }>(error) ? error : undefined;
  const serverMessage = failure?.response?.data?.error;
  const message = typeof serverMessage === 'string' && serverMessage
    ? serverMessage
    : failure?.code === 'ECONNABORTED' || failure?.code === 'ETIMEDOUT'
      ? 'A solicitação demorou demais. Tente novamente.'
      : failure?.response
        ? 'Não foi possível concluir. Tente novamente.'
        : 'Não foi possível conectar. Confira a conexão e tente novamente.';
  return Promise.reject(new Error(message));
}

export function createHttpClient({ adapter, timeout = 10000 }: { adapter?: AxiosAdapter; timeout?: number } = {}) {
  const client = axios.create({
    baseURL: '/api',
    timeout,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json', 'X-Cupcake-Request': '1' },
    ...(adapter ? { adapter } : {})
  });
  client.interceptors.response.use(response => response, normalizeError);
  return client;
}
