import pg from 'pg';
import { HttpError, hashPassword, verifyPassword } from './security.mjs';

export function createPool() {
  return new pg.Pool({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'cupcake_store',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD,
    max: 5,
    connectionTimeoutMillis: 3000,
    statement_timeout: 5000,
    application_name: 'cupcake_store_pitii'
  });
}

const productFields = `p.id, p.nome AS name, p.descricao AS description, p.preco AS price,
  p.peso_gramas AS weight, p.imagem_url AS image, p.estoque_disponivel AS stock,
  c.nome AS category, c.id AS category_id`;

export class PgStore {
  constructor(pool) { this.pool = pool; }

  async products() {
    const result = await this.pool.query(`SELECT ${productFields} FROM public.produto p
      JOIN public.categoria c ON c.id = p.categoria_id WHERE p.ativo ORDER BY p.nome, p.id`);
    return result.rows;
  }

  async product(id) {
    const result = await this.pool.query(`SELECT ${productFields} FROM public.produto p
      JOIN public.categoria c ON c.id = p.categoria_id WHERE p.ativo AND p.id = $1`, [id]);
    if (!result.rows[0]) throw new HttpError(404, 'Produto não encontrado.');
    return result.rows[0];
  }

  async user(id) {
    const result = await this.pool.query('SELECT id, nome, email, perfil FROM public.usuario WHERE id = $1 AND ativo', [id]);
    return result.rows[0] || null;
  }

  async register({ email, password, name }) {
    const hash = await hashPassword(password);
    try {
      const result = await this.pool.query(`INSERT INTO public.usuario (nome, email, senha_hash, perfil)
        VALUES ($1, $2, $3, 'CLIENTE') RETURNING id, nome, email, perfil`, [name, email, hash]);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') throw new HttpError(409, 'Este e-mail já está cadastrado. Entre na sua conta.');
      throw error;
    }
  }

  async login({ email, password }) {
    const client = await this.pool.connect();
    let finished = false;
    try {
      await client.query('BEGIN');
      const result = await client.query('SELECT * FROM public.usuario WHERE email = $1 FOR UPDATE', [email]);
      const user = result.rows[0];
      if (!user || !user.ativo) {
        await verifyPassword(password, null);
        await client.query('COMMIT');
        finished = true;
        throw new HttpError(401, 'E-mail ou senha inválidos.');
      }
      if (user.bloqueado_ate && new Date(user.bloqueado_ate).getTime() > Date.now()) {
        await client.query('COMMIT');
        finished = true;
        throw new HttpError(429, 'Acesso temporariamente bloqueado. Tente novamente em 15 minutos.');
      }
      const reset = user.bloqueado_ate && new Date(user.bloqueado_ate).getTime() <= Date.now();
      if (!await verifyPassword(password, user.senha_hash)) {
        const attempts = (reset ? 0 : user.tentativas_falhas) + 1;
        await client.query(`UPDATE public.usuario SET tentativas_falhas = $2,
          bloqueado_ate = CASE WHEN $2 >= 5 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes' ELSE NULL END
          WHERE id = $1`, [user.id, attempts]);
        await client.query('COMMIT');
        finished = true;
        throw new HttpError(attempts >= 5 ? 429 : 401, attempts >= 5
          ? 'Acesso temporariamente bloqueado. Tente novamente em 15 minutos.' : 'E-mail ou senha inválidos.');
      }
      await client.query('UPDATE public.usuario SET tentativas_falhas = 0, bloqueado_ate = NULL WHERE id = $1', [user.id]);
      await client.query('COMMIT');
      finished = true;
      return user;
    } catch (error) {
      if (!finished) await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
}
