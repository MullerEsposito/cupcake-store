# Modelos da Sprint 8

Diagramas mantidos como fonte Graphviz DOT, SVG ampliável e PNG incorporado na documentação revisada.

- `uml-principal` e `uml-auditoria`: classes TypeScript com atributos representativos e associações. As operações estão nos serviços; não foram inventados métodos nas entidades.
- `conceitual-principal` e `conceitual-auditoria`: entidades e atributos de negócio, sem tipos SQL nem FKs.
- `fisico-catalogo`, `fisico-pedidos` e `fisico-auditoria`: vistas resumidas com chaves e campos relevantes. O dicionário na seção 15.6 de `../../sprint-8.md` é completo; as variantes `*-completo` preservam mais colunas para ampliação.
- `arquitetura`: camadas, integrações de endereço e eventos.
- `estados-pedido`: estados e política de cancelamento.

As associações das vistas de auditoria mostram as multiplicidades como origem / destino na legenda da ligação. Em todas as vistas, o mesmo nome identifica a mesma entidade, mesmo que repetida em outro recorte. A lista completa de relações e suas garantias está na seção 15.5 da documentação.

Pedido–ItemPedido tem mínimo de um item no negócio; a FK física sozinha permite zero. Usuário–Carrinho é opcional por causa de visitantes; a unicidade de carrinho ATIVO usa índices parciais, não cardinalidade global 1:1. Cancelamento–Pagamento é opcional e único.

Os modelos físicos foram confrontados com metadados do PostgreSQL local em 20/10/2026: onze tabelas de negócio e dezoito FKs. Colunas anuláveis são marcadas com ?. As FKs são restritivas para exclusão, exceto itens de carrinho que acompanham a exclusão do carrinho; não se deve deduzir CASCADE apenas do losango UML.

Com Graphviz instalado, reproduza com:

```sh
dot -Tsvg uml-principal.dot -o uml-principal.svg
dot -Tpng uml-principal.dot -o uml-principal.png
```

O uso acadêmico das APIs não valida imóvel nem promete entrega real. Diagramas e texto distinguem o modelo de negócio, a implementação ORM e garantias declarativas/transacionais.
