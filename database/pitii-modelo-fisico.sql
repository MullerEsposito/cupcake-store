BEGIN;

DO $$
BEGIN
    IF current_database() <> 'cupcake_store' THEN
        RAISE EXCEPTION 'Conecte-se ao banco cupcake_store antes de executar este script.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('usuario', 'endereco', 'categoria', 'produto', 'carrinho',
              'item_carrinho', 'pedido', 'item_pedido', 'pagamento')
    ) THEN
        RAISE EXCEPTION 'Já existem tabelas do projeto. Não reaplique a criação inicial; utilize uma migração.';
    END IF;
END;
$$;

SET LOCAL search_path TO public;

CREATE TABLE usuario (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome VARCHAR(150) NOT NULL CHECK (btrim(nome) <> ''),
    email VARCHAR(254) NOT NULL CHECK (email = lower(btrim(email)) AND email <> ''),
    senha_hash TEXT NOT NULL CHECK (senha_hash <> ''),
    perfil VARCHAR(10) NOT NULL DEFAULT 'CLIENTE' CHECK (perfil IN ('CLIENTE', 'ADMIN')),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    tentativas_falhas INTEGER NOT NULL DEFAULT 0 CHECK (tentativas_falhas >= 0),
    bloqueado_ate TIMESTAMPTZ,
    UNIQUE (email)
);

CREATE TABLE endereco (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    destinatario VARCHAR(150) NOT NULL CHECK (btrim(destinatario) <> ''),
    cep VARCHAR(8) NOT NULL CHECK (cep ~ '^[0-9]{8}$'),
    logradouro VARCHAR(200) NOT NULL CHECK (btrim(logradouro) <> ''),
    numero VARCHAR(20) NOT NULL CHECK (btrim(numero) <> ''),
    complemento VARCHAR(150),
    bairro VARCHAR(100) NOT NULL CHECK (btrim(bairro) <> ''),
    cidade VARCHAR(100) NOT NULL CHECK (btrim(cidade) <> ''),
    uf VARCHAR(2) NOT NULL CHECK (uf ~ '^[A-Z]{2}$'),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (id, usuario_id)
);

CREATE TABLE categoria (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome VARCHAR(100) NOT NULL CHECK (btrim(nome) <> ''),
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE produto (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    categoria_id BIGINT NOT NULL REFERENCES categoria(id) ON DELETE RESTRICT,
    nome VARCHAR(150) NOT NULL CHECK (btrim(nome) <> ''),
    descricao TEXT NOT NULL,
    preco NUMERIC(12,2) NOT NULL CHECK (preco >= 0),
    peso_gramas NUMERIC(10,3) NOT NULL CHECK (peso_gramas >= 0),
    imagem_url TEXT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    estoque_disponivel INTEGER NOT NULL DEFAULT 0 CHECK (estoque_disponivel >= 0)
);

CREATE TABLE carrinho (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT REFERENCES usuario(id) ON DELETE RESTRICT,
    token_sessao VARCHAR(128),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(12) NOT NULL DEFAULT 'ATIVO'
        CHECK (estado IN ('ATIVO', 'CONVERTIDO', 'ABANDONADO')),
    CHECK (usuario_id IS NOT NULL OR nullif(btrim(token_sessao), '') IS NOT NULL),
    CHECK (atualizado_em >= criado_em)
);

CREATE TABLE item_carrinho (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    carrinho_id BIGINT NOT NULL REFERENCES carrinho(id) ON DELETE CASCADE,
    produto_id BIGINT NOT NULL REFERENCES produto(id) ON DELETE RESTRICT,
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    UNIQUE (carrinho_id, produto_id)
);

CREATE TABLE pedido (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    numero VARCHAR(40) NOT NULL UNIQUE CHECK (btrim(numero) <> ''),
    usuario_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    endereco_id BIGINT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(25) NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO'
        CHECK (status IN ('AGUARDANDO_PAGAMENTO', 'PAGAMENTO_APROVADO',
            'EM_PREPARACAO', 'SAIU_PARA_ENTREGA', 'ENTREGUE', 'CANCELADO')),
    entrega_destinatario VARCHAR(150) NOT NULL CHECK (btrim(entrega_destinatario) <> ''),
    entrega_cep VARCHAR(8) NOT NULL CHECK (entrega_cep ~ '^[0-9]{8}$'),
    entrega_logradouro VARCHAR(200) NOT NULL CHECK (btrim(entrega_logradouro) <> ''),
    entrega_numero VARCHAR(20) NOT NULL CHECK (btrim(entrega_numero) <> ''),
    entrega_complemento VARCHAR(150),
    entrega_bairro VARCHAR(100) NOT NULL CHECK (btrim(entrega_bairro) <> ''),
    entrega_cidade VARCHAR(100) NOT NULL CHECK (btrim(entrega_cidade) <> ''),
    entrega_uf VARCHAR(2) NOT NULL CHECK (entrega_uf ~ '^[A-Z]{2}$'),
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
    frete NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (frete >= 0),
    total NUMERIC(12,2) NOT NULL CHECK (total = subtotal + frete),
    FOREIGN KEY (endereco_id, usuario_id)
        REFERENCES endereco(id, usuario_id) ON DELETE RESTRICT
);

CREATE TABLE item_pedido (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES pedido(id) ON DELETE RESTRICT,
    produto_id BIGINT NOT NULL REFERENCES produto(id) ON DELETE RESTRICT,
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(12,2) NOT NULL CHECK (preco_unitario >= 0),
    nome_produto_snapshot VARCHAR(150) NOT NULL CHECK (btrim(nome_produto_snapshot) <> ''),
    UNIQUE (pedido_id, produto_id)
);

CREATE TABLE pagamento (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES pedido(id) ON DELETE RESTRICT,
    metodo VARCHAR(10) NOT NULL CHECK (metodo IN ('PIX', 'CARTAO', 'BOLETO')),
    status VARCHAR(10) NOT NULL DEFAULT 'PENDENTE'
        CHECK (status IN ('PENDENTE', 'APROVADO', 'RECUSADO', 'FALHA')),
    valor NUMERIC(12,2) NOT NULL CHECK (valor >= 0),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processado_em TIMESTAMPTZ,
    chave_idempotencia VARCHAR(128) NOT NULL UNIQUE CHECK (btrim(chave_idempotencia) <> ''),
    simulado BOOLEAN NOT NULL DEFAULT TRUE CHECK (simulado),
    motivo_resultado TEXT,
    CHECK ((status = 'PENDENTE' AND processado_em IS NULL)
        OR (status <> 'PENDENTE' AND processado_em IS NOT NULL)),
    CHECK (processado_em IS NULL OR processado_em >= criado_em)
);

CREATE UNIQUE INDEX carrinho_ativo_usuario ON carrinho(usuario_id)
    WHERE estado = 'ATIVO' AND usuario_id IS NOT NULL;
CREATE UNIQUE INDEX carrinho_ativo_sessao ON carrinho(token_sessao)
    WHERE estado = 'ATIVO' AND usuario_id IS NULL;
CREATE UNIQUE INDEX pagamento_aprovado_pedido ON pagamento(pedido_id)
    WHERE status = 'APROVADO';
CREATE INDEX endereco_usuario ON endereco(usuario_id);
CREATE INDEX produto_categoria_preco ON produto(categoria_id, preco) WHERE ativo;
CREATE INDEX item_carrinho_produto ON item_carrinho(produto_id);
CREATE INDEX pedido_usuario_data ON pedido(usuario_id, criado_em DESC);
CREATE INDEX pedido_status_data ON pedido(status, criado_em DESC);
CREATE INDEX pedido_endereco_usuario ON pedido(endereco_id, usuario_id);
CREATE INDEX item_pedido_produto ON item_pedido(produto_id);
CREATE INDEX pagamento_pedido_data ON pagamento(pedido_id, criado_em DESC);

COMMIT;
