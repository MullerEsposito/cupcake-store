import type { Response } from 'express';
import type { AuthenticationResult } from '../../../modules/users/contracts/AuthenticationResult.js';
import { sessionCookie } from './session-cookie.js';

export function authenticatedResponse(response: Response, result: AuthenticationResult,
  origin: string, status: number): Response {
  return response.status(status).set('Set-Cookie', sessionCookie(result.token, origin)).json({ user: result.user });
}
