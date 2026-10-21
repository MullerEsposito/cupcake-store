import { createHash, randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import type { ISharedRuntime } from '../../shared/contracts/ISharedRuntime.js';
import { ApplicationError } from '../../shared/errors/ApplicationError.js';

export class PostgresRuntime implements ISharedRuntime {
  constructor(private readonly dataSource: DataSource) {}

  async consumeRateLimit(identity: string, maximum: number): Promise<void> {
    const key = createHash('sha256').update(identity).digest('hex');
    await this.dataSource.query('DELETE FROM app_runtime.rate_limit WHERE identity_hash IN (SELECT identity_hash FROM app_runtime.rate_limit WHERE expires_at <= clock_timestamp() LIMIT 100)');
    const rows: { count: number }[] = await this.dataSource.query(`INSERT INTO app_runtime.rate_limit AS entry (identity_hash, count, expires_at)
      VALUES ($1, 1, clock_timestamp() + interval '1 minute')
      ON CONFLICT (identity_hash) DO UPDATE SET
        count = CASE WHEN entry.expires_at <= clock_timestamp() THEN 1 ELSE LEAST(entry.count + 1, 1000000) END,
        expires_at = CASE WHEN entry.expires_at <= clock_timestamp() THEN EXCLUDED.expires_at ELSE entry.expires_at END
      RETURNING count`, [key]);
    if (!rows[0] || rows[0].count > maximum) throw new ApplicationError('RATE_LIMIT', 'Muitas tentativas. Aguarde um minuto.');
  }

  async orderVersion(userId: string): Promise<string> {
    const rows: { version: string }[] = await this.dataSource.query('SELECT version::text FROM app_runtime.order_revision WHERE user_id = $1', [userId]);
    return rows[0]?.version ?? '0';
  }

  async announceOrder(userId: string): Promise<void> {
    await this.dataSource.query('INSERT INTO app_runtime.order_revision (user_id, version) VALUES ($1, 1) ON CONFLICT (user_id) DO UPDATE SET version = app_runtime.order_revision.version + 1', [userId]);
  }

  async acquireOrderStream(userId: string): Promise<() => Promise<void>> {
    const id = randomUUID();
    await this.dataSource.transaction(async manager => {
      await manager.query('SELECT pg_advisory_xact_lock(72419001)');
      await manager.query('DELETE FROM app_runtime.order_stream WHERE expires_at <= clock_timestamp()');
      const [counts]: { total: number; owned: number }[] = await manager.query('SELECT count(*)::integer AS total, count(*) FILTER (WHERE user_id = $1)::integer AS owned FROM app_runtime.order_stream', [userId]);
      if (!counts || counts.total >= 100 || counts.owned >= 3) throw new ApplicationError('RATE_LIMIT', 'Muitas conexões de acompanhamento abertas.');
      await manager.query("INSERT INTO app_runtime.order_stream (id, user_id, expires_at) VALUES ($1, $2, clock_timestamp() + interval '5 minutes')", [id, userId]);
    });
    return async () => { await this.dataSource.query('DELETE FROM app_runtime.order_stream WHERE id = $1', [id]); };
  }
}
