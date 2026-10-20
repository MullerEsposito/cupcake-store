import type { Request } from 'express';
import type { ControllerDependencies } from './dependencies.js';

export interface AuthenticationContext {
  token: string | undefined;
  userId: string | null;
}

export type ApiRequest = Request<Record<string, string | string[]>, unknown, unknown> & {
  authentication?: AuthenticationContext;
};
export interface HttpLocals {
  dependencies: ControllerDependencies;
  rateLimit(request: Pick<Request, 'socket'>): void;
}
export function getDependencies(request: Pick<Request, 'app'>): ControllerDependencies {
  return (request.app.locals as HttpLocals).dependencies;
}
