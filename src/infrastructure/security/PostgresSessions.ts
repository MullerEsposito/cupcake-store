import { createHash, randomBytes } from 'node:crypto';
import type { DataSource } from 'typeorm';
import type { ISessions } from '../../shared/contracts/ISecurity.js';

export class PostgresSessions implements ISessions {
  constructor(private readonly dataSource: DataSource) {}

  async create(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const digest = createHash('sha256').update(token).digest('hex');
    await this.dataSource.query('DELETE FROM app_runtime.session WHERE token_hash IN (SELECT token_hash FROM app_runtime.session WHERE expires_at <= clock_timestamp() LIMIT 100)');
    await this.dataSource.query("INSERT INTO app_runtime.session (token_hash, user_id, expires_at) VALUES ($1, $2, clock_timestamp() + interval '8 hours')", [digest, userId]);
    return token;
  }

  async get(token: string | undefined): Promise<string | null> {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const digest = createHash('sha256').update(token).digest('hex');
    const rows: { user_id: string }[] = await this.dataSource.query('SELECT user_id::text FROM app_runtime.session WHERE token_hash = $1 AND expires_at > clock_timestamp()', [digest]);
    return rows[0]?.user_id ?? null;
  }

  async delete(token: string | undefined): Promise<void> {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return;
    await this.dataSource.query('DELETE FROM app_runtime.session WHERE token_hash = $1', [createHash('sha256').update(token).digest('hex')]);
  }
}
