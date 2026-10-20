import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { AppDataSource } from '../src/infrastructure/typeorm/data-source.ts';
import { ViaCepProvider } from '../src/infrastructure/postal-code/ViaCepProvider.ts';

const origin = process.env.APP_ORIGIN || 'http://localhost:3000';
try {
  await AppDataSource.initialize();
  const tables = ['usuario', 'endereco', 'categoria', 'produto', 'carrinho', 'item_carrinho',
    'pedido', 'item_pedido', 'pagamento', 'cancelamento_pedido', 'movimentacao_estoque'];
  const columns = await AppDataSource.query(`SELECT table_name, column_name, data_type, is_nullable,
    character_maximum_length, numeric_precision, numeric_scale, column_default, is_identity
    FROM information_schema.columns WHERE table_schema='public' AND table_name = ANY($1)
    ORDER BY table_name, ordinal_position`, [tables]);
  const constraints = await AppDataSource.query(`SELECT conrelid::regclass::text AS table_name, conname,
    contype, pg_get_constraintdef(oid) AS definition FROM pg_constraint
    WHERE connamespace='public'::regnamespace AND conrelid::regclass::text = ANY($1)
    ORDER BY conrelid::regclass::text, conname`, [tables]);
  const indexes = await AppDataSource.query(`SELECT tablename, indexname, indexdef FROM pg_indexes
    WHERE schemaname='public' AND tablename=ANY($1) ORDER BY tablename,indexname`, [tables]);
  assert.equal(new Set(columns.map(column => column.table_name)).size, 11);
  const statistics = [];
  for (const [name, path, limit] of [['vitrine API', '/api/products', 3000], ['busca API', '/api/products?q=chocolate', 2000]]) {
    const durations = [];
    let productCount = 0;
    for (let sample = 0; sample < 20; sample++) {
      const start = performance.now();
      const response = await fetch(origin + path, { signal: AbortSignal.timeout(10000) });
      assert.equal(response.status, 200);
      const data = await response.json();
      productCount = data.products.length;
      durations.push(performance.now() - start);
    }
    const sorted = [...durations].sort((left, right) => left - right);
    statistics.push({ name, samples: durations.length, productCount, limitMs: limit,
      firstMs: durations[0], medianMs: sorted[9], p95Ms: sorted[18], maximumMs: sorted[19],
      withinApiBudget: sorted[19] < limit });
  }
  let postalCode;
  try {
    postalCode = { available: true, result: await new ViaCepProvider().lookup('01001000') };
  } catch (error) {
    postalCode = { available: false, error: error.message };
  }
  console.log(JSON.stringify({ recordedAt: new Date().toISOString(), database: 'cupcake_store',
    node: process.version, platform: process.platform, scope: 'Somente leitura; API local, sem simular carga concorrente ou medir renderização.',
    columns, constraints, indexes, statistics, postalCode }, null, 2));
} finally {
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
}
