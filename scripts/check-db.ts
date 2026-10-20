import { errorCode } from '../src/shared/errors/error-info.js';
import { AppDataSource as dataSource } from '../src/infrastructure/typeorm/data-source.js';
import { ProductsRepository } from '#repositories/ProductsRepository';
import { UsersRepository } from '#repositories/UsersRepository';

interface DatabaseInfo { banco: string; versao: string; tabelas: string }
try {
  await dataSource.initialize();
  const [info] = await dataSource.query<DatabaseInfo[]>(`SELECT current_database() AS banco, version() AS versao,
    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'
      AND table_name IN ('usuario','endereco','categoria','produto','carrinho','item_carrinho','pedido','item_pedido','pagamento','cancelamento_pedido')) AS tabelas`);
  if (!info || info.banco !== 'cupcake_store' || Number(info.tabelas) !== 10) throw new Error('Confira o banco cupcake_store e execute npm run migrate para as dez tabelas de negócio.');
  const products = await new ProductsRepository().listActive();
  await new UsersRepository().findActiveById('0');
  await new UsersRepository().withLockedUser('__diagnostico_sem_usuario__', async () => null);
  console.log(`Conexão TypeORM confirmada: ${info.banco}; dez tabelas de negócio presentes; catálogo com ${products.length} produtos. ${info.versao}`);
} catch (error) {
  console.error('Não foi possível validar a conexão. Confira o arquivo .env e o serviço PostgreSQL.', errorCode(error));
  process.exitCode = 1;
} finally {
  if (dataSource.isInitialized) await dataSource.destroy();
}
