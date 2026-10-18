import { createPool } from '../src/store.mjs';

const pool = createPool();
try {
  const result = await pool.query(`SELECT current_database() AS banco, version() AS versao,
    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'
      AND table_name IN ('usuario','endereco','categoria','produto','carrinho','item_carrinho','pedido','item_pedido','pagamento')) AS tabelas`);
  const info = result.rows[0];
  if (info.banco !== 'cupcake_store' || Number(info.tabelas) !== 9) throw new Error('Confira o banco cupcake_store e as nove tabelas.');
  console.log(`Conexão confirmada: ${info.banco}; nove tabelas presentes. ${info.versao}`);
} catch (error) {
  console.error('Não foi possível validar a conexão. Confira o arquivo .env e o serviço PostgreSQL.', error.code || error.message);
  process.exitCode = 1;
} finally { await pool.end(); }
