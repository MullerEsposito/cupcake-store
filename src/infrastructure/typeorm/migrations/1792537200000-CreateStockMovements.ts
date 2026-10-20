import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStockMovements1792537200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('LOCK TABLE public.produto IN SHARE ROW EXCLUSIVE MODE');
    await queryRunner.query(`CREATE TABLE public.movimentacao_estoque (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      produto_id BIGINT NOT NULL REFERENCES public.produto(id) ON DELETE RESTRICT,
      nome_produto VARCHAR(150) NOT NULL,
      tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ABERTURA','INICIALIZACAO','REPOSICAO','CORRECAO','VENDA','DEVOLUCAO')),
      quantidade INTEGER NOT NULL,
      saldo_anterior INTEGER NOT NULL CHECK (saldo_anterior >= 0),
      saldo_posterior INTEGER NOT NULL CHECK (saldo_posterior >= 0),
      motivo VARCHAR(500) NOT NULL CHECK (length(btrim(motivo)) BETWEEN 5 AND 500),
      usuario_id BIGINT REFERENCES public.usuario(id) ON DELETE RESTRICT,
      perfil_usuario VARCHAR(10) NOT NULL CHECK (perfil_usuario IN ('SISTEMA','ADMIN','CLIENTE')),
      origem VARCHAR(20) NOT NULL CHECK (origem IN ('SISTEMA','ADMINISTRATIVO')),
      pedido_id BIGINT REFERENCES public.pedido(id) ON DELETE RESTRICT,
      pagamento_id BIGINT REFERENCES public.pagamento(id) ON DELETE RESTRICT,
      cancelamento_id BIGINT REFERENCES public.cancelamento_pedido(id) ON DELETE RESTRICT,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
      CHECK (saldo_posterior::BIGINT = saldo_anterior::BIGINT + quantidade::BIGINT),
      CHECK (
        (tipo IN ('ABERTURA','INICIALIZACAO') AND quantidade >= 0 AND saldo_anterior = 0)
        OR (tipo IN ('REPOSICAO','DEVOLUCAO') AND quantidade > 0)
        OR (tipo IN ('CORRECAO','VENDA') AND quantidade < 0)
      ),
      CHECK ((usuario_id IS NULL AND perfil_usuario = 'SISTEMA') OR (usuario_id IS NOT NULL AND perfil_usuario IN ('ADMIN','CLIENTE'))),
      CHECK (
        (tipo = 'ABERTURA' AND origem = 'SISTEMA' AND usuario_id IS NULL AND pedido_id IS NULL AND pagamento_id IS NULL AND cancelamento_id IS NULL)
        OR (tipo IN ('INICIALIZACAO','REPOSICAO','CORRECAO') AND origem = 'ADMINISTRATIVO' AND perfil_usuario = 'ADMIN'
          AND usuario_id IS NOT NULL AND pedido_id IS NULL AND pagamento_id IS NULL AND cancelamento_id IS NULL)
        OR (tipo = 'VENDA' AND origem = 'SISTEMA' AND usuario_id IS NOT NULL AND pedido_id IS NOT NULL AND pagamento_id IS NOT NULL AND cancelamento_id IS NULL)
        OR (tipo = 'DEVOLUCAO' AND origem = 'SISTEMA' AND usuario_id IS NOT NULL AND pedido_id IS NOT NULL AND pagamento_id IS NOT NULL AND cancelamento_id IS NOT NULL)
      )
    )`);
    await queryRunner.query("CREATE UNIQUE INDEX movimentacao_estoque_abertura_unica ON public.movimentacao_estoque (produto_id) WHERE tipo IN ('ABERTURA','INICIALIZACAO')");
    await queryRunner.query("CREATE UNIQUE INDEX movimentacao_estoque_venda_unica ON public.movimentacao_estoque (pedido_id, produto_id) WHERE tipo = 'VENDA'");
    await queryRunner.query("CREATE UNIQUE INDEX movimentacao_estoque_devolucao_unica ON public.movimentacao_estoque (cancelamento_id, produto_id) WHERE tipo = 'DEVOLUCAO'");
    await queryRunner.query('CREATE INDEX movimentacao_estoque_data ON public.movimentacao_estoque (criado_em DESC, id DESC)');
    await queryRunner.query('CREATE INDEX movimentacao_estoque_produto_data ON public.movimentacao_estoque (produto_id, criado_em DESC, id DESC)');
    await queryRunner.query('CREATE INDEX movimentacao_estoque_usuario ON public.movimentacao_estoque (usuario_id)');
    await queryRunner.query('CREATE INDEX movimentacao_estoque_pedido ON public.movimentacao_estoque (pedido_id)');
    await queryRunner.query(`INSERT INTO public.movimentacao_estoque
      (produto_id, nome_produto, tipo, quantidade, saldo_anterior, saldo_posterior, motivo, perfil_usuario, origem)
      SELECT id, nome, 'ABERTURA', estoque_disponivel, 0, estoque_disponivel,
        'Saldo de abertura na implantação da auditoria; histórico anterior não reconstruído.', 'SISTEMA', 'SISTEMA'
      FROM public.produto ORDER BY id`);
    await queryRunner.query(`CREATE FUNCTION public.proteger_movimentacao_estoque() RETURNS trigger
      LANGUAGE plpgsql SET search_path = pg_catalog AS $$
      BEGIN
        RAISE EXCEPTION 'Histórico de estoque é somente leitura; registre uma movimentação compensatória.' USING ERRCODE = '23514';
      END;
      $$`);
    await queryRunner.query(`CREATE TRIGGER movimentacao_estoque_imutavel
      BEFORE UPDATE OR DELETE ON public.movimentacao_estoque FOR EACH ROW
      EXECUTE FUNCTION public.proteger_movimentacao_estoque()`);
    await queryRunner.query(`CREATE TRIGGER movimentacao_estoque_sem_truncate
      BEFORE TRUNCATE ON public.movimentacao_estoque FOR EACH STATEMENT
      EXECUTE FUNCTION public.proteger_movimentacao_estoque()`);
  }

  async down(): Promise<void> {
    throw new Error('Reversão automática bloqueada para preservar o histórico de estoque.');
  }
}
