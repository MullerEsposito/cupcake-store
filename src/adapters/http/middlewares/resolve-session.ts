import type { RequestHandler } from 'express';
import type { ApiRequest } from '../contracts.js';
import { getDependencies } from '../contracts.js';
import { readSessionToken } from '../helpers/session-cookie.js';

export const resolveSession: RequestHandler = async (request: ApiRequest, response, next) => {
  const token = readSessionToken(request);
  request.authentication = {
    token,
    userId: await getDependencies(request).sessions.get(token)
  };
  next();
};
