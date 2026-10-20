import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrderCancellations1792454400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE public.cancelamento_pedido (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      pedido_id BIGINT NOT NULL UNIQUE REFERENCES public.pedido(id) ON DELETE RESTRICT,
      usuario_id BIGINT NOT NULL REFERENCES public.usuario(id) ON DELETE RESTRICT,
      perfil_usuario VARCHAR(10) NOT NULL CHECK (perfil_usuario IN ('CLIENTE', 'ADMIN')),
      status_anterior VARCHAR(25) NOT NULL CHECK (status_anterior IN ('AGUARDANDO_PAGAMENTO', 'PAGAMENTO_APROVADO', 'EM_PREPARACAO')),
      motivo VARCHAR(500) NOT NULL CHECK (length(btrim(motivo)) BETWEEN 5 AND 500),
      chave_idempotencia VARCHAR(128) NOT NULL UNIQUE CHECK (chave_idempotencia ~ '^[a-zA-Z0-9_-]{16,128}$'),
      criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
      pagamento_id BIGINT UNIQUE REFERENCES public.pagamento(id) ON DELETE RESTRICT,
      status_estorno VARCHAR(20) NOT NULL CHECK (status_estorno IN ('NAO_APLICAVEL', 'SIMULADO')),
      valor_estorno NUMERIC(12,2) NOT NULL CHECK (valor_estorno >= 0),
      estornado_em TIMESTAMPTZ,
      estoque_reposto BOOLEAN NOT NULL,
      simulado BOOLEAN NOT NULL DEFAULT TRUE CHECK (simulado),
      CHECK (
        (status_anterior = 'AGUARDANDO_PAGAMENTO' AND pagamento_id IS NULL AND status_estorno = 'NAO_APLICAVEL'
          AND valor_estorno = 0 AND estornado_em IS NULL AND NOT estoque_reposto)
        OR (status_anterior IN ('PAGAMENTO_APROVADO', 'EM_PREPARACAO') AND pagamento_id IS NOT NULL
          AND status_estorno = 'SIMULADO' AND estornado_em IS NOT NULL AND estornado_em >= criado_em AND estoque_reposto)
      )
    )`);
  }

  async down(): Promise<void> {
    throw new Error('Reversão automática bloqueada para preservar os registros de cancelamento e estorno.');
  }
}
