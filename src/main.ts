import { resolve } from 'node:path';
import { errorCode } from './shared/errors/error-info.js';
import { AppDataSource as dataSource } from './infrastructure/typeorm/data-source.js';
import { composeDependencies } from './composition.js';
import { createApp } from './adapters/http/server.js';

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida.');
try {
  await dataSource.initialize();
  const app = createApp(composeDependencies(dataSource), {
    origin: process.env.APP_ORIGIN || `http://localhost:${port}`,
    staticDirectory: resolve('dist')
  });
  const server = app.listen(port, '127.0.0.1', () => console.log(`CupCake Store: http://localhost:${port}`));
  const closeDatabase = async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  };
  server.on('error', error => {
    console.error('Não foi possível iniciar a aplicação:', errorCode(error));
    void closeDatabase().catch(() => {}).finally(() => { process.exitCode = 1; });
  });
  const shutdown = () => server.close(() => {
    void closeDatabase().finally(() => process.exit(0));
  });
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error('Não foi possível iniciar a aplicação:', errorCode(error));
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exitCode = 1;
}
