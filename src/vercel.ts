import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createApp } from './adapters/http/server.js';
import { AppDataSource } from './infrastructure/typeorm/data-source.js';
import { composeDependencies } from './composition.js';
import { PostgresSessions } from './infrastructure/security/PostgresSessions.js';
import { PostgresRuntime } from './infrastructure/security/PostgresRuntime.js';
import { errorCode } from './shared/errors/error-info.js';

let application: Promise<ReturnType<typeof createApp>> | undefined;

async function initializeApplication() {
  const origin = process.env.APP_ORIGIN;
  if (!origin || new URL(origin).origin !== origin || !origin.startsWith('https://')) throw new Error('APP_ORIGIN HTTPS obrigatória.');
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  await AppDataSource.query("SELECT token_hash FROM app_runtime.session LIMIT 0");
  return createApp({
    ...composeDependencies(AppDataSource),
    sessions: new PostgresSessions(AppDataSource),
    sharedRuntime: new PostgresRuntime(AppDataSource)
  }, { origin, staticDirectory: fileURLToPath(new URL('./', import.meta.url)) });
}

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  try {
    application ??= initializeApplication().catch(error => { application = undefined; throw error; });
    const app = await application;
    if (response.destroyed) return;
    await new Promise<void>(resolve => {
      response.once('finish', resolve);
      response.once('close', resolve);
      app(request, response);
    });
  } catch (error) {
    console.error('Inicialização da demonstração indisponível:', errorCode(error));
    if (!response.headersSent) {
      response.statusCode = 503;
      response.setHeader('Content-Type', 'application/json');
      response.setHeader('Cache-Control', 'no-store');
      response.end(JSON.stringify({ error: 'Demonstração temporariamente indisponível. Tente novamente.' }));
    } else response.end();
  }
}
