import { createHash, randomBytes } from 'node:crypto';
import type { Request } from 'express';

export function readCartToken(request: Pick<Request, 'headers'>): string | undefined {
  const token = request.headers.cookie?.split(';').map(value => value.trim())
    .find(value => value.startsWith('cupcake_cart='))?.slice('cupcake_cart='.length);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : undefined;
}

export const createCartToken = (): string => randomBytes(32).toString('hex');
export const cartTokenHash = (token: string): string => createHash('sha256').update(token).digest('hex');

export function cartCookie(token: string, origin: string, clear = false): string {
  return `cupcake_cart=${clear ? '' : token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear ? 0 : 2592000}${origin.startsWith('https:') ? '; Secure' : ''}`;
}
