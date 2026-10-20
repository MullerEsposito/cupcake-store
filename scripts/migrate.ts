import { createDataSource } from '../src/infrastructure/typeorm/data-source.js';
import { errorCode } from '../src/shared/errors/error-info.js';

const source = createDataSource();
try {
  await source.initialize();
  const applied = await source.runMigrations({ transaction: 'all' });
  console.log(applied.length ? `Migrações aplicadas: ${applied.map(migration => migration.name).join(', ')}` : 'Banco atualizado: nenhuma migração pendente.');
} catch (error) {
  console.error('Não foi possível aplicar a migração. Nenhuma sincronização automática foi executada.', errorCode(error));
  process.exitCode = 1;
} finally {
  if (source.isInitialized) await source.destroy();
}
