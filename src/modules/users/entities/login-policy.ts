import type { LoginState } from '../contracts/LoginState.js';

export const loginPolicy = Object.freeze({ maxAttempts: 5, blockMilliseconds: 15 * 60 * 1000 });

export function isBlocked(user: LoginState, now: number): boolean {
  return user.blockedUntil !== null && new Date(user.blockedUntil).getTime() > now;
}

export function failedLoginState(user: LoginState, now: number): LoginState {
  const expired = user.blockedUntil !== null && new Date(user.blockedUntil).getTime() <= now;
  const failedAttempts = (expired ? 0 : user.failedAttempts) + 1;
  return { failedAttempts, blockedUntil: failedAttempts >= loginPolicy.maxAttempts ? new Date(now + loginPolicy.blockMilliseconds) : null };
}
