import type { Request } from 'express';

const cookieName = 'cupcake_session';

export function readSessionToken(request: Pick<Request, 'headers'>): string | undefined {
  const prefix = `${cookieName}=`;
  return request.headers.cookie?.split(';').map(value => value.trim())
    .find(value => value.startsWith(prefix))?.slice(prefix.length);
}

export function sessionCookie(token: string, origin: string, { clear = false } = {}) {
  return `${cookieName}=${clear ? '' : token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear ? 0 : 28800}${origin.startsWith('https:') ? '; Secure' : ''}`;
}
