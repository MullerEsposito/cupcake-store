import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { createDataSource } from '../src/infrastructure/typeorm/data-source.js';
import { hashPassword } from '../src/infrastructure/security/primitives.js';
import { errorCode } from '../src/shared/errors/error-info.js';

const resource = process.argv.find(value => value.startsWith('--resource='))?.slice(11);
const expectedDatabase = process.argv.find(value => value.startsWith('--database='))?.slice(11);
const connection = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (resource !== 'cupcake-store-demo' || !expectedDatabase || !connection) throw new Error('Informe explicitamente o recurso e o banco de demonstração.');
const address = new URL(connection);
if (!address.hostname.endsWith('.neon.tech') || decodeURIComponent(address.pathname.slice(1)) !== expectedDatabase) throw new Error('Destino não corresponde ao Neon de demonstração.');
process.env.DATABASE_URL = connection;
const source = createDataSource();
try {
  await source.initialize();
  const [identity]: { name: string }[] = await source.query('SELECT current_database() AS name');
  if (identity?.name !== expectedDatabase) throw new Error('Banco de destino divergente.');
  const tables: unknown[] = await source.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
  if (tables.length) throw new Error('Provisionamento inicial exige banco dedicado vazio. Não há reset automático.');
  for (const filename of ['pitii-modelo-fisico.sql', '04-catalogo-desenvolvimento.sql']) {
    const original = await readFile(new URL('../database/' + filename, import.meta.url), 'utf8');
    const statement = original.replace("current_database() <> 'cupcake_store'", "current_database() <> '" + expectedDatabase.replaceAll("'", "''") + "'");
    if (statement === original) throw new Error('Guarda do script não reconhecida.');
    await source.query(statement);
  }
  await source.runMigrations({ transaction: 'all' });
  await source.query(await readFile(new URL('../database/05-demo-runtime.sql', import.meta.url), 'utf8'));
  const password = randomBytes(24).toString('base64url');
  const email = 'admin.demo@example.com';
  const passwordHash = await hashPassword(password);
  await source.query("INSERT INTO public.usuario (nome, email, senha_hash, perfil) VALUES ('Administrador Demonstração', $1, $2, 'ADMIN')", [email, passwordHash]);
  await writeFile(new URL('../.env.demo-accounts.local', import.meta.url), `DEMO_ADMIN_EMAIL=${email}\nDEMO_ADMIN_PASSWORD=${password}\n`, { flag: 'wx', mode: 0o600 });
  const [counts]: { products: number; movements: number }[] = await source.query('SELECT (SELECT count(*)::integer FROM public.produto) AS products, (SELECT count(*)::integer FROM public.movimentacao_estoque) AS movements');
  console.log(JSON.stringify({ resource, database: expectedDatabase, businessTables: 11, runtimeTables: 4, products: counts?.products, openingMovements: counts?.movements, adminCredentials: 'Arquivo local ignorado pelo Git; não compartilhar em chat.' }));
} catch (error) {
  console.error('Provisionamento de demonstração interrompido, sem reset do banco:', errorCode(error));
  process.exitCode = 1;
} finally {
  if (source.isInitialized) await source.destroy();
}
