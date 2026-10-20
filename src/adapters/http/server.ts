import { withDataSource } from '#infrastructure/typeorm/repository-context';
import type { RuntimeDependencies } from './dependencies.js';

import express from 'express';
import { resolve, relative, sep } from 'node:path';
import { securityHeaders, verifyOrigin, createRateLimiter } from './middlewares/security.js';
import { errorHandler } from './helpers/response.js';
import { router } from './routes/index.js';

export function createApp(dependencies: RuntimeDependencies, {
  origin = 'http://localhost:3000',
  logger = console,
  staticDirectory = resolve('dist')
} = {}) {
  const app = express();
  app.locals.dependencies = { ...dependencies, origin };
  app.locals.rateLimit = createRateLimiter();
  app.locals.cartRateLimit = createRateLimiter({ maximum: 120 });
  app.disable('x-powered-by');
  app.disable('etag');
  app.set('case sensitive routing', true);
  app.set('strict routing', true);
  app.use((request, response, next) => {
    securityHeaders(response);
    response.set('Cache-Control', 'no-store');
    verifyOrigin(request, origin);
    next();
  });

  app.use('/api', (request, response, next) => withDataSource(dependencies.dataSource, next), router);
  app.use(express.static(resolve(staticDirectory), {
    dotfiles: 'deny',
    redirect: false,
    etag: false,
    setHeaders(response, filename) {
      response.setHeader('Cache-Control', relative(resolve(staticDirectory), filename).startsWith(`assets${sep}`)
        ? 'public, max-age=31536000, immutable' : 'no-cache');
    }
  }));
  app.use((request, response) => response.status(404).json({ error: 'Página não encontrada.' }));
  app.use(errorHandler(logger));
  return app;
}
