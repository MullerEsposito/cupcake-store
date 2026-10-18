BEGIN;

DO $$
DECLARE
    teste_usuario BIGINT;
    teste_outro_usuario BIGINT;
    teste_endereco BIGINT;
    teste_categoria BIGINT;
    teste_produto BIGINT;
    teste_carrinho BIGINT;
    teste_pedido BIGINT;
    teste_prefixo TEXT := 'pit-teste-' || txid_current()::TEXT;
    teste_tabelas INTEGER;
BEGIN
    IF current_database() <> 'cupcake_store' THEN
        RAISE EXCEPTION 'Conecte-se ao banco cupcake_store.';
    END IF;

    SELECT count(*) INTO teste_tabelas
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      AND table_name IN ('usuario', 'endereco', 'categoria', 'produto', 'carrinho',
          'item_carrinho', 'pedido', 'item_pedido', 'pagamento');
    IF teste_tabelas <> 9 THEN
        RAISE EXCEPTION 'Esperadas 9 tabelas, encontradas %.', teste_tabelas;
    END IF;

    INSERT INTO usuario(nome, email, senha_hash, ativo)
    VALUES ('Cliente fictício de teste', teste_prefixo || '@example.invalid', 'HASH_FICTICIO_SEM_LOGIN', FALSE)
    RETURNING id INTO teste_usuario;

    INSERT INTO usuario(nome, email, senha_hash, ativo)
    VALUES ('Outro cliente fictício', teste_prefixo || '-outro@example.invalid', 'HASH_FICTICIO_SEM_LOGIN', FALSE)
    RETURNING id INTO teste_outro_usuario;

    INSERT INTO endereco(usuario_id, destinatario, cep, logradouro, numero, bairro, cidade, uf)
    VALUES (teste_usuario, 'Teste', '01001000', 'Rua fictícia', '1', 'Centro', 'São Paulo', 'SP')
    RETURNING id INTO teste_endereco;

    INSERT INTO categoria(nome) VALUES ('Categoria fictícia') RETURNING id INTO teste_categoria;
    INSERT INTO produto(categoria_id, nome, descricao, preco, peso_gramas, imagem_url, estoque_disponivel)
    VALUES (teste_categoria, 'Cupcake fictício', 'Apenas teste', 10, 80, '/teste.png', 1)
    RETURNING id INTO teste_produto;

    INSERT INTO carrinho(usuario_id) VALUES (teste_usuario) RETURNING id INTO teste_carrinho;
    INSERT INTO item_carrinho(carrinho_id, produto_id, quantidade)
    VALUES (teste_carrinho, teste_produto, 1);

    INSERT INTO pedido(numero, usuario_id, endereco_id, entrega_destinatario, entrega_cep,
        entrega_logradouro, entrega_numero, entrega_bairro, entrega_cidade, entrega_uf, subtotal, total)
    VALUES (teste_prefixo, teste_usuario, teste_endereco, 'Teste', '01001000',
        'Rua fictícia', '1', 'Centro', 'São Paulo', 'SP', 10, 10)
    RETURNING id INTO teste_pedido;

    INSERT INTO item_pedido(pedido_id, produto_id, quantidade, preco_unitario, nome_produto_snapshot)
    VALUES (teste_pedido, teste_produto, 1, 10, 'Cupcake fictício');

    BEGIN
        INSERT INTO usuario(nome, email, senha_hash)
        VALUES ('Duplicado', teste_prefixo || '@example.invalid', 'HASH_FICTICIO_SEM_LOGIN');
        RAISE EXCEPTION 'Falhou: email duplicado foi aceito.';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'OK: email único';
    END;

    BEGIN
        UPDATE item_carrinho SET quantidade = 0 WHERE carrinho_id = teste_carrinho;
        RAISE EXCEPTION 'Falhou: quantidade zero foi aceita.';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'OK: quantidade positiva';
    END;

    BEGIN
        UPDATE produto SET estoque_disponivel = -1 WHERE id = teste_produto;
        RAISE EXCEPTION 'Falhou: estoque negativo foi aceito.';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'OK: estoque não negativo';
    END;

    BEGIN
        UPDATE pedido SET usuario_id = teste_outro_usuario WHERE id = teste_pedido;
        RAISE EXCEPTION 'Falhou: endereço de outro usuário foi aceito.';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'OK: endereço pertence ao comprador';
    END;

    BEGIN
        INSERT INTO carrinho(usuario_id) VALUES (teste_usuario);
        RAISE EXCEPTION 'Falhou: segundo carrinho ativo foi aceito.';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'OK: um carrinho ativo por usuário';
    END;

    INSERT INTO pagamento(pedido_id, metodo, status, valor, processado_em, chave_idempotencia)
    VALUES (teste_pedido, 'PIX', 'APROVADO', 10, CURRENT_TIMESTAMP, teste_prefixo || '-pagamento-1');

    BEGIN
        INSERT INTO pagamento(pedido_id, metodo, status, valor, processado_em, chave_idempotencia)
        VALUES (teste_pedido, 'PIX', 'APROVADO', 10, CURRENT_TIMESTAMP, teste_prefixo || '-pagamento-2');
        RAISE EXCEPTION 'Falhou: segunda aprovação foi aceita.';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'OK: no máximo um pagamento aprovado';
    END;

    BEGIN
        INSERT INTO pagamento(pedido_id, metodo, valor, chave_idempotencia, simulado)
        VALUES (teste_pedido, 'PIX', 10, teste_prefixo || '-pagamento-real', FALSE);
        RAISE EXCEPTION 'Falhou: pagamento não simulado foi aceito.';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'OK: pagamento exclusivamente simulado';
    END;

    RAISE NOTICE 'OK: 9 tabelas presentes e 7 restrições negativas verificadas. Dados válidos inseridos nas 9 tabelas. Reverter os dados com ROLLBACK.';
END;
$$;

ROLLBACK;
