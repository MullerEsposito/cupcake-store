# Sprint 3 — endereços, checkout e pagamentos simulados

## Escopo implementado

- Cadastro e seleção de endereços exclusivos da conta autenticada. CEP e UF são validados localmente; não há consulta a serviço postal.
- Checkout autenticado com validação de usuário ativo, endereço, carrinho, produtos, quantidades, preços e limite monetário do banco.
- Frete gratuito na demonstração acadêmica, conforme decisão do projeto; nenhuma cotação ou entrega real é contratada.
- Pedido com cópia imutável dos dados de entrega, nomes e preços unitários. A mudança posterior no cadastro não altera a compra registrada.
- PIX, cartão e boleto exclusivamente simulados, com resultados aprovados, recusados ou com falha. Não são coletados dados bancários nem gerados meios reais de cobrança.
- Recuperação dos últimos 50 pedidos da própria conta e retomada de pagamentos pendentes. Acompanhamento logístico e painel administrador continuam na Sprint 4.

## Fluxo e estados

1. O visitante entra ou se cadastra; o carrinho é incorporado antes do checkout.
2. O cliente seleciona ou cadastra um endereço e confirma o subtotal exibido.
3. Uma transação cria pedido `AGUARDANDO_PAGAMENTO`, itens com snapshots e pagamento `PENDENTE`, convertendo o carrinho para `CONVERTIDO`.
4. O carrinho convertido deixa de ser editável; novos itens formam outro carrinho. O pedido permanece acessível pela conta, mesmo após recarregar a página.
5. A simulação aprovada revalida disponibilidade e baixa todos os produtos, aprova o pagamento e muda o pedido para `PAGAMENTO_APROVADO` na mesma transação.
6. Recusa ou falha mantém o pedido aguardando pagamento, sem baixar estoque. É possível repetir com outra tentativa. Estoque insuficiente transforma uma aprovação solicitada em `FALHA`, sem baixa parcial.

Carrinho e pedido aguardando pagamento **não reservam estoque**. A disponibilidade exibida pode mudar até a aprovação. Os estados `EM_PREPARACAO`, `SAIU_PARA_ENTREGA`, `ENTREGUE` e `CANCELADO` já existem no modelo físico, mas sua administração não faz parte desta sprint.

## Consistência e segurança

- Identidade vem da sessão, nunca do corpo da requisição. Endereços e pedidos são filtrados pelo proprietário.
- Valores são calculados no servidor em centavos inteiros (`bigint`), respeitando `NUMERIC(12,2)`. `expectedSubtotal` confirma o valor visto pelo cliente; não define preços, total ou frete.
- Checkout compartilha o mesmo bloqueio transacional do carrinho da Sprint 2. Chaves de idempotência também são serializadas por bloqueio transacional.
- Pagamentos bloqueiam o pedido e os produtos em ordem crescente de ID. Pedidos concorrentes disputando o mesmo estoque não conseguem aprovar uma quantidade superior à disponível.
- Todos os produtos são verificados antes de qualquer baixa. Falhas na persistência revertem estoque, status e pagamento juntos.
- A chave única de pagamento e o índice de no máximo um pagamento aprovado por pedido continuam como garantias adicionais no banco.
- Reenviar checkout com a mesma chave e os mesmos dados retorna o pedido existente. Dados incompatíveis ou chave usada por outra conta retornam conflito.
- Reenviar pagamento já processado retorna o resultado persistido, mesmo que o resultado solicitado seja diferente: a primeira execução vence. Uma nova tentativa após recusa/falha usa nova chave. Não se inicia outra tentativa enquanto houver uma pendente.
- Mutações exigem origem permitida, cabeçalho da aplicação e corpo JSON limitado. Endereços, carrinho e checkout compartilham o limite de mutações por IP já existente.
- Não há alteração automática do esquema, cobrança externa, integração financeira ou exposição de credenciais.

## Endpoints

| Método | Endpoint | Finalidade |
| --- | --- | --- |
| GET | `/api/addresses` | Até 100 endereços ativos da conta |
| POST | `/api/addresses` | Cadastrar endereço |
| GET | `/api/orders` | Últimos 50 pedidos da conta, itens e pagamentos |
| POST | `/api/orders/checkout` | Criar pedido e tentativa pendente |
| POST | `/api/orders/:id/payments` | Executar ou repetir uma tentativa simulada |

Checkout recebe `addressId`, `method`, `expectedSubtotal` e `idempotencyKey`. Pagamento recebe `method`, `outcome` e `idempotencyKey`. Campos extras são recusados. Uma chave deve conter 16–128 caracteres alfanuméricos, hífen ou sublinhado; a interface usa UUID.

## Validação

- `npm run typecheck`, `npm test` e `npm run build` verificam contratos, arquitetura, HTTP, validações e empacotamento.
- `npm run check:sprint3` exercita repositórios e HTTP com o PostgreSQL configurado no `.env`. Os dados fictícios ficam dentro de transação externa revertida no final; sequências de IDs podem avançar.
- O diagnóstico verifica propriedade, snapshots, recusa/falha, retomada, repetição idempotente, baixa única, falta de estoque e rollback após falha injetada na gravação do pagamento.
- Esse diagnóstico é sequencial: os bloqueios foram implementados para concorrência, mas a simulação de carga paralela com conexões independentes não faz parte dele.

## Limites conhecidos

Sessões continuam em memória e são perdidas ao reiniciar o servidor. Edição/exclusão de endereços, cancelamento e expiração automática de pedidos, paginação do histórico e integração de frete ficam para evolução posterior. Não considerar este protótipo um processador de pagamentos real.
