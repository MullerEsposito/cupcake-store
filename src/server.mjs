import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { HttpError, Sessions, credentials, publicUser } from './security.mjs';

const publicDir = new URL('../public/', import.meta.url);
const files = new Map([['/', ['index.html', 'text/html']], ['/app.js', ['app.js', 'text/javascript']], ['/style.css', ['style.css', 'text/css']], ['/cupcake.svg', ['cupcake.svg', 'image/svg+xml']]]);

async function body(request) {
  if (!request.headers['content-type']?.startsWith('application/json')) throw new HttpError(415, 'Envie os dados em JSON.');
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 8192) throw new HttpError(413, 'Dados acima do limite permitido.');
    chunks.push(chunk);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch { throw new HttpError(400, 'Dados inválidos.'); }
}

function token(request) {
  return request.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith('cupcake_session='))?.slice(16);
}

export function createApp(store, { sessions = new Sessions(), origin = 'http://localhost:3000', logger = console } = {}) {
  const limits = new Map();
  function rateLimit(request) {
    const now = Date.now();
    for (const [key, item] of limits) if (item.expires <= now) limits.delete(key);
    const key = request.socket.remoteAddress || 'local';
    const value = limits.get(key) || { count: 0, expires: now + 60000 };
    value.count += 1;
    limits.set(key, value);
    if (value.count > 20) throw new HttpError(429, 'Muitas tentativas. Aguarde um minuto.');
  }
  return http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'same-origin');
    response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const json = (status, data) => {
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(data));
    };
    try {
      const url = new URL(request.url, origin);
      if (request.method === 'POST') {
        if (request.headers.origin !== origin || request.headers['x-cupcake-request'] !== '1') {
          throw new HttpError(403, 'Origem da solicitação não permitida. Atualize a página.');
        }
      }
      if (request.method === 'GET' && files.has(url.pathname)) {
        const [name, type] = files.get(url.pathname);
        const contents = await readFile(new URL(name, publicDir));
        response.writeHead(200, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-cache' });
        response.end(contents);
        return;
      }
      if (request.method === 'GET' && url.pathname === '/api/products') return json(200, { products: await store.products() });
      if (request.method === 'GET' && /^\/api\/products\/[1-9][0-9]{0,17}$/.test(url.pathname)) {
        return json(200, { product: await store.product(url.pathname.split('/').at(-1)) });
      }
      if (request.method === 'GET' && url.pathname === '/api/session') {
        const id = sessions.get(token(request));
        const user = id ? await store.user(id) : null;
        return json(200, { user: user ? publicUser(user) : null });
      }
      if (request.method === 'POST' && ['/api/register', '/api/login'].includes(url.pathname)) {
        rateLimit(request);
        const input = credentials(await body(request), url.pathname === '/api/register');
        const user = await (url.pathname === '/api/register' ? store.register(input) : store.login(input));
        sessions.delete(token(request));
        const sessionToken = sessions.create(user.id);
        response.setHeader('Set-Cookie', `cupcake_session=${sessionToken}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${origin.startsWith('https:') ? '; Secure' : ''}`);
        return json(url.pathname === '/api/register' ? 201 : 200, { user: publicUser(user) });
      }
      if (request.method === 'POST' && url.pathname === '/api/logout') {
        sessions.delete(token(request));
        response.setHeader('Set-Cookie', 'cupcake_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
        return json(200, { message: 'Você saiu da sua conta.' });
      }
      throw new HttpError(404, 'Página não encontrada.');
    } catch (error) {
      if (error instanceof HttpError) return json(error.status, { error: error.message });
      logger.error('Falha de operação:', { code: error.code || 'INTERNAL' });
      return json(503, { error: 'Não foi possível acessar o banco. Confira a configuração local e tente novamente.' });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { createPool, PgStore } = await import('./store.mjs');
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida.');
  const origin = `http://localhost:${port}`;
  const pool = createPool();
  pool.on('error', error => console.error('Conexão PostgreSQL interrompida:', error.code));
  const server = createApp(new PgStore(pool), { origin });
  server.listen(port, '127.0.0.1', () => console.log(`CupCake Store: ${origin}`));
  const shutdown = () => server.close(() => { pool.end().finally(() => process.exit(0)); });
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
