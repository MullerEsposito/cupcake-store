# Sprint 5 — cancelamento e estorno simulado

## Política aprovada

Cliente autenticado pode cancelar seus próprios pedidos; ADMIN ativo pode cancelar qualquer pedido. O cancelamento é permitido em `AGUARDANDO_PAGAMENTO`, `PAGAMENTO_APROVADO` e `EM_PREPARACAO`. É bloqueado a partir de `SAIU_PARA_ENTREGA`, inclusive para administradores. Pedido cancelado não pode ser reativado; uma nova compra exige outro carrinho/checkout.

O motivo (5–500 caracteres), a confirmação explícita na interface e o estado esperado são obrigatórios. Se o estado mudar após a tela ser carregada, o servidor rejeita a operação para que o usuário atualize e confirme novamente.

Todos os pagamentos e estornos são **exclusivamente simulados**. Não há envio de dinheiro, integração bancária, gateway, webhook ou promessa de prazo de crédito real.

## Efeitos por situação

| Situação | Estorno | Estoque |
| --- | --- | --- |
| Sem aprovação de pagamento, inclusive recusa/falha anterior | `NAO_APLICAVEL`, valor zero | Sem reposição, pois não houve baixa |
| Pagamento aprovado ou pedido em preparação | `SIMULADO`, valor integral do pagamento aprovado | Reposição integral uma única vez |
| Saiu para entrega ou entregue | Operação rejeitada | Sem alteração |

Um pagamento aprovado de valor zero também tem estorno simulado e reposição de estoque, pois a aprovação baixou as unidades. Produtos inativos recebem a reposição sem serem reativados. Não existe estorno parcial neste incremento.

O pagamento originalmente aprovado continua `APROVADO` como registro histórico. O resultado do estorno é um registro separado, mostrado ao lado do cancelamento. Tentativas ainda `PENDENTE` são encerradas como `FALHA`, com motivo de cancelamento e data de processamento; recusas e falhas anteriores permanecem preservadas. Reenvio de chave de pagamento já processada apenas devolve o pedido atual, inclusive cancelado, sem nova aprovação ou baixa. Novas tentativas em pedido cancelado são rejeitadas.

## Consistência e idempotência

Uma única transação valida o usuário/perfil, bloqueia o pedido, confere pagamento e estado, bloqueia os produtos em ordem crescente de ID, registra cancelamento/estorno, repõe estoque, encerra pendências e marca o pedido `CANCELADO`.

Cancelamento, aprovação de pagamento e avanço logístico disputam o bloqueio do mesmo pedido. Se o pagamento vencer primeiro, um cancelamento confirmado com o estado anterior é rejeitado até nova confirmação. Se o cancelamento vencer, nenhuma nova tentativa pode aprovar esse pedido. Ajustes de estoque e reposição compartilham bloqueio do produto. Nenhum produto é reposto antes de conferir todos os itens e limites.

Falha em qualquer gravação ou impossibilidade de reposição integral reverte todos os efeitos. Não se registra estorno bem-sucedido deixando o pedido ativo ou o estoque parcialmente devolvido. Não há registro financeiro de sucesso para uma transação que falhou.

- A chave de cancelamento é persistente e única, com bloqueio transacional por chave.
- Repetir a mesma chave, ator, pedido, motivo e estado esperado retorna o registro existente sem repetir efeitos.
- Reutilizar a chave com outros dados retorna 409.
- Uma nova chave para um pedido já cancelado retorna 409 e orienta consultar o registro existente.
- Restrições únicas por pedido e pagamento impedem registros duplicados mesmo além das verificações da aplicação.
- A identidade e o perfil vêm da sessão e do banco; o corpo não pode definir ator, valor do estorno ou reposição.
- Consultas de detalhes do cliente e listagens administrativas usam snapshot consistente para apresentar estado e registro de cancelamento coerentes.

## Modelo físico e migração

`cancelamento_pedido` é uma nova entidade de negócio, sem alterar ou apagar as nove tabelas anteriores. Tem relacionamento 0..1 com Pedido; cada registro pertence a um único pedido. Usuário possui 0..N cancelamentos como ator. Um cancelamento pago referencia exatamente um Pagamento aprovado; cancelamentos não pagos não referenciam pagamento. Um pagamento só pode aparecer em um cancelamento.

Campos: ID, pedido, usuário responsável, perfil no momento da ação, estado anterior, motivo, chave de idempotência, data, pagamento opcional, estado/valor/data do estorno, indicador de estoque reposto e indicador obrigatório de simulação. Valores usam `NUMERIC(12,2)` e a data é obtida do PostgreSQL. FKs usam `RESTRICT`; não há endpoint de edição/exclusão desses registros. Trata-se de auditoria persistente pela aplicação, não de proteção contra alterações por um operador privilegiado do banco.

Execute **`npm run migrate`** explicitamente antes de iniciar esta versão. A migração TypeORM `CreateOrderCancellations1792454400000` cria a tabela e o controle `migrations`, totalizando dez tabelas de negócio mais a tabela técnica. Executar novamente não reaplica a migração. O banco inicial ainda deve ser criado pelos scripts originais; a migração não substitui a instalação inicial.

`synchronize`, `dropSchema` e `migrationsRun` continuam desativados. A inicialização da aplicação não altera o esquema. A reversão automática da migração é bloqueada para evitar exclusão de auditoria; eventual retorno de versão deve preservar esses dados e ser planejado separadamente. Não reaplique a criação inicial do banco.

## API e interface

| Método | Endpoint | Acesso |
| --- | --- | --- |
| POST | `/api/orders/:id/cancel` | Proprietário autenticado |
| POST | `/api/admin/orders/:id/cancel` | ADMIN ativo |

Corpo: `reason`, `expectedStatus`, `idempotencyKey` (16–128 caracteres alfanuméricos, hífen ou sublinhado). Campos extras são rejeitados. Valor estornado é calculado no servidor a partir do pagamento aprovado, nunca do navegador. Origem, cabeçalho da aplicação, JSON limitado e limite de mutações permanecem obrigatórios.

O resumo do cliente apresenta formulário com motivo e confirmação; o painel administrativo possui a seção “Cancelar pedido / estorno simulado”. Depois da operação, ambas as visões exibem motivo, ator, data, valor e resultado do estorno e da reposição. O cliente não ganha acesso a pedidos alheios. Cancelamento administrativo tem autorização revalidada dentro da transação.

## Validação e limites

`npm test`, `npm run typecheck` e `npm run build` verificam arquitetura, contratos, validações, interface e empacotamento. `npm run check:db` passa a conferir dez tabelas de negócio. `npm run check:sprint5` executa fixtures em transação externa e reverte os dados ao final; sequências podem avançar. A migração estrutural permanece aplicada.

O diagnóstico cobre pedidos pagos/não pagos, recusas, preparação, bloqueio após expedição/entrega, pedido gratuito, produtos inativos, autorizações, repetição de chave, restrições de unicidade, limites de estoque e falha injetada depois das gravações intermediárias. Cancelamentos e estornos fictícios são revertidos; nenhum pedido real é cancelado automaticamente. Os diagnósticos anteriores continuam como regressão.

Os cenários de integração são sequenciais e não substituem teste de carga concorrente com conexões independentes. Não estão incluídos devolução após entrega, troca, estorno parcial, chargeback, processamento financeiro real nem extrato financeiro líquido. Relatórios futuros devem considerar estornos separadamente do histórico de aprovações. Sessões seguem em memória no processo local.
