import type { Request } from 'express';
import type { ServerResponse } from 'node:http';

import { HttpError } from '../errors/http-error.js';

export function securityHeaders(response: Pick<ServerResponse, 'setHeader'>, styleNonce?: string): void {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'same-origin');
  response.setHeader('Content-Security-Policy', `default-src 'self'; img-src 'self' https:; style-src 'self'${styleNonce ? " 'nonce-" + styleNonce + "'" : ''}; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`);
}

export function verifyOrigin(request: Pick<Request, 'method' | 'headers'>, origin: string): void {
  if (request.method === 'POST' && (request.headers.origin !== origin || request.headers['x-cupcake-request'] !== '1')) {
    throw new HttpError(403, 'Origem da solicitação não permitida. Atualize a página.');
  }
}

export function createRateLimiter({ clock = Date.now, maximum = 20, windowMilliseconds = 60000 } = {}) {
  const entries = new Map<string, { count: number; expires: number }>();
  return (request: Pick<Request, 'socket'>): void => {
    const now = clock();
    for (const [key, entry] of entries) if (entry.expires <= now) entries.delete(key);
    const key = request.socket.remoteAddress || 'local';
    const entry = entries.get(key) || { count: 0, expires: now + windowMilliseconds };
    entry.count += 1;
    entries.set(key, entry);
    if (entry.count > maximum) throw new HttpError(429, 'Muitas tentativas. Aguarde um minuto.');
  };
}
