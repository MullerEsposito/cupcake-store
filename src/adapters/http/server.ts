import { withDataSource } from '#infrastructure/typeorm/repository-context';
import type { RuntimeDependencies } from './dependencies.js';

import express from 'express';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
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
  app.get(/^\/(?:index\.html|produtos(?:\/[^/.]+)?|sobre|carrinho|entrar|checkout|pedidos(?:\/[^/.]+)?|administracao)?$/, async (request, response, next) => {
    if (!request.accepts('html')) { next(); return; }
    try {
      const html = await readFile(resolve(staticDirectory, 'index.html'), 'utf8');
      const nonce = randomBytes(24).toString('base64');
      securityHeaders(response, nonce);
      response.set('Cache-Control', 'no-store');
      response.type('html').send(html.replace('__CSP_NONCE__', nonce));
    } catch (error) { next(error); }
  });
  app.use(express.static(resolve(staticDirectory), {
    index: false,
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
