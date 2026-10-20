import type { RequestHandler } from 'express';
import type { ApiRequest } from '../contracts.js';
import { ApplicationError } from '#shared/errors/ApplicationError';

export const requireSession: RequestHandler = (request: ApiRequest, response, next) => {
  if (!request.authentication?.userId) throw new ApplicationError('UNAUTHORIZED', 'Entre na sua conta para continuar.');
  next();
};
