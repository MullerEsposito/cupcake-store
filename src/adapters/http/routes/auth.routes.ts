import type { RequestHandler } from 'express';
import type { HttpLocals } from '../contracts.js';
import { getDependencies } from '../contracts.js';
import { Router } from 'express';
import { getRegisterUserController } from '#users-usecases/registerUser/index';
import { getAuthenticateUserController } from '#users-usecases/authenticateUser/index';
import { getCurrentUserController } from '#users-usecases/getCurrentUser/index';
import { getLogoutUserController } from '#users-usecases/logoutUser/index';
import { jsonBody } from '../helpers/request-body.js';

import { resolveSession } from '../middlewares/resolve-session.js';

export const authRoutes = Router({ caseSensitive: true, strict: true });

const limit: RequestHandler = async (request, response, next) => {
  await (request.app.locals as HttpLocals).rateLimit(request);
  next();
};

authRoutes.get('/session', resolveSession, (request, response) => getCurrentUserController().handle(request, response));
authRoutes.post('/register', limit, ...jsonBody(), resolveSession, (request, response) => getRegisterUserController(getDependencies(request)).handle(request, response));
authRoutes.post('/login', limit, ...jsonBody(), resolveSession, (request, response) => getAuthenticateUserController(getDependencies(request)).handle(request, response));
authRoutes.post('/logout', resolveSession, (request, response) => getLogoutUserController(getDependencies(request)).handle(request, response));
