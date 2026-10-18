BEGIN;

DO $$
BEGIN
    IF current_database() <> 'cupcake_store' THEN
        RAISE EXCEPTION 'Execute no banco cupcake_store.';
    END IF;
END;
$$;

SELECT pg_advisory_xact_lock(72418004);

INSERT INTO public.categoria(nome, descricao)
SELECT 'Catálogo de desenvolvimento', 'Produtos fictícios para o protótipo acadêmico PIT II.'
WHERE NOT EXISTS (SELECT 1 FROM public.categoria WHERE nome = 'Catálogo de desenvolvimento');

WITH categoria_alvo AS (
    SELECT id FROM public.categoria WHERE nome = 'Catálogo de desenvolvimento' ORDER BY id LIMIT 1
), exemplos(nome, descricao, preco, peso) AS (
    VALUES
      ('Chocolate & carinho', 'Cupcake fictício de chocolate com cobertura cremosa. Dado de desenvolvimento.', 12.90, 85),
      ('Morango delicado', 'Cupcake fictício com inspiração em morango e cobertura rosa. Dado de desenvolvimento.', 13.90, 80),
      ('Baunilha da casa', 'Cupcake fictício de baunilha, delicado e macio. Dado de desenvolvimento.', 11.90, 80),
      ('Red velvet', 'Cupcake fictício inspirado no clássico red velvet. Dado de desenvolvimento.', 14.90, 90)
)
INSERT INTO public.produto(categoria_id, nome, descricao, preco, peso_gramas, imagem_url, estoque_disponivel)
SELECT categoria_alvo.id, exemplos.nome, exemplos.descricao, exemplos.preco, exemplos.peso, '/cupcake.svg', 20
FROM categoria_alvo CROSS JOIN exemplos
WHERE NOT EXISTS (
    SELECT 1 FROM public.produto
    WHERE produto.categoria_id = categoria_alvo.id AND produto.nome = exemplos.nome
);

COMMIT;
