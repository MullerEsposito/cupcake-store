# Sprint 7 — auditoria ampliada de estoque

## Escopo implementado

Histórico permanente de inicializações, reposições, correções, baixas por pagamento aprovado e devoluções por cancelamento. O saldo do produto e sua movimentação são gravados na mesma transação. As regras de checkout, pagamento simulado, cancelamento e devolução única das sprints anteriores permanecem vigentes.

## Modelo físico

A migração CreateStockMovements1792537200000 acrescenta a tabela public.movimentacao_estoque, totalizando onze tabelas de negócio, além da tabela técnica de migrações. O esquema inicial e a migração de cancelamentos devem precedê-la. synchronize, dropSchema e migrationsRun continuam desativados.

| Campo | Significado |
| --- | --- |
| id | Identidade BIGINT, retornada como texto pela API |
| produto_id, nome_produto | Referência ao produto e nome preservado no instante do registro |
| tipo | ABERTURA, INICIALIZACAO, REPOSICAO, CORRECAO, VENDA ou DEVOLUCAO |
| quantidade | Variação com sinal; zero permitido somente na abertura/inicialização |
| saldo_anterior, saldo_posterior | Saldos inteiros não negativos |
| motivo | Justificativa com 5–500 caracteres |
| usuario_id, perfil_usuario | Autor e perfil no instante da operação; autor nulo apenas na abertura |
| origem | ADMINISTRATIVO ou SISTEMA, distinguindo autoria de execução automática |
| pedido_id, pagamento_id, cancelamento_id | Origem comercial, quando aplicável |
| criado_em | TIMESTAMPTZ gerado pelo servidor PostgreSQL |

Cardinalidades: um produto possui muitas movimentações; cada movimentação pertence a exatamente um produto. Usuário, pedido, pagamento e cancelamento podem ter várias movimentações, uma por produto envolvido; seus vínculos são opcionais conforme o tipo. Uma movimentação possui no máximo um vínculo de cada espécie. A abertura não representa uma venda histórica.

As CHECK constraints validam aritmética em BIGINT, sinais, saldos e combinações obrigatórias de origem/autor/vínculos. FKs usam ON DELETE RESTRICT. Índices únicos garantem uma abertura/inicialização por produto, uma venda por pedido/produto e uma devolução por cancelamento/produto. Índices por data/ID, produto, usuário e pedido apoiam as consultas. Triggers rejeitam UPDATE, DELETE e TRUNCATE do histórico; correções devem gerar novas movimentações.

## Migração e saldos anteriores

Execute npm run migrate explicitamente. A migração bloqueia escritas de produtos enquanto captura o saldo de abertura de todos os produtos, inclusive inativos ou zerados, sem mudar seus saldos. Não inventa autores nem reconstrói operações anteriores. Reaplicar o comando não duplica registros, pois TypeORM controla migrações executadas. A reversão automática é bloqueada para não apagar evidências.

Produtos cadastrados pela aplicação recebem INICIALIZACAO, inclusive com estoque zero. Para um produto importado diretamente após a implantação e ainda sem histórico, a primeira operação auditada captura ABERTURA do saldo observado, sob o mesmo bloqueio/transação, antes da variação. Isso não reconstitui o histórico anterior da importação.

## Integrações transacionais

- Cadastro: inserção de produto e INICIALIZACAO são indivisíveis.
- Ajuste administrativo: exige expectedStock, delta inteiro não nulo e reason. Delta positivo gera REPOSICAO; negativo gera CORRECAO. Reposição/correção compensatória usa nova operação e motivo, nunca edição do histórico.
- Pagamento: aprovação simulada registra VENDA para cada produto; tentativas recusadas ou falhas não movimentam estoque. O pagamento é persistido dentro da mesma transação antes de ser referenciado pela movimentação.
- Cancelamento pago: gera DEVOLUCAO por produto, vinculada ao pagamento original e ao cancelamento auditável. Cancelamento sem aprovação não movimenta estoque.
- Identidades e vínculos são obtidos no backend, não aceitos do corpo enviado pelo navegador.
- Bloqueios pessimistas de produtos e conferência do saldo no UPDATE impedem sobrescritas. Produtos de um pedido são bloqueados em ordem de ID.
- Falha ao inserir auditoria reverte integralmente estoque, pagamento/pedido ou cancelamento. Repetições de pagamento/cancelamento reutilizam os resultados anteriores, sem movimentações duplicadas.

A API não repete POST automaticamente. Ajustes manuais são operações independentes protegidas por expectedStock, não uma API de idempotência de ajustes. Após resposta incerta, consulte o histórico antes de criar outro ajuste. Não há reserva de estoque no carrinho.

## API e apresentação

GET /api/admin/stock-movements retorna movements: { items, page, pageSize, total }. pageSize é fixo em 20; ordenação criado_em DESC, id DESC. Autenticação e perfil ADMIN são revalidados pelo serviço e pelo repositório.

Filtros opcionais: productId, type, actorId, orderId, from, to e page. IDs são BIGINTs positivos em texto; datas usam AAAA-MM-DD e período válido. from e to representam dias inclusivos em America/Sao_Paulo; o limite superior SQL é exclusivo no início do dia seguinte. Consultas são parametrizadas e contagem/listagem usam snapshot REPEATABLE READ.

Página /administracao/estoque, protegida para ADMIN, acessível pelo painel. Apresenta saldos, variação, motivo escapado, autor, origem e vínculos; permite filtrar, paginar e atualizar, sem controles de alteração. Datas são apresentadas no fuso de Brasília. Componentes seguem index.tsx + styles.tsx com styled-components. O formulário de ajustes passa a exigir motivo.

## Arquitetura

Módulo inventory: entidade StockMovement, contratos, IInventoryRepository, InventoryRepository e caso de uso listStockMovements com serviço/controller/fábrica. O serviço depende da interface. A função de persistência stock-ledger recebe o EntityManager da transação já aberta pelos repositórios existentes e recusa execução fora de transação; ela não abre conexão nem transação independente. Não há dependência ORM nos serviços de negócio.

## Verificação

- npm test: validações, acesso, transação obrigatória, rollback simulado, SQL parametrizado, modelo, migração, Axios e apresentação.
- npm run typecheck e npm run build: contratos e compilação.
- npm run check:db: conexão, onze tabelas e repositórios básicos.
- npm run check:sprint7: dados fictícios em transação externa revertida; verifica fluxos completos, falhas reais de gravação, idempotência, restrições, imutabilidade, paginação, filtros, snapshots e autorização HTTP. Sequências podem avançar mesmo com ROLLBACK.
- npm run check:sprint7:concurrency: exige permissão CREATEDB. Cria banco temporário cupcake_s7_test_<identificador aleatório>, monta o esquema inicial e as migrações, executa operações concorrentes em conexões distintas e remove somente o banco criado e identificado por marcador. Não utiliza registros do cupcake_store. Verifica última unidade, pagamentos/cancelamentos repetidos e disputas venda/ajuste, estorno/ajuste e pagamento/cancelamento. Nenhuma sincronização automática do TypeORM é habilitada. Se a limpeza falhar, o diagnóstico informa o nome do banco temporário e termina com erro, sem forçar desconexões.

Para implantação local, pare o backend, aplique a migração, execute os diagnósticos e reinicie na porta 3000. Reinício encerra sessões em memória; será necessário entrar novamente. Na validação visual, apenas consultar o histórico e o formulário; não usar pedidos/estoque reais para demonstrar alterações.

## Limites

A auditoria cobre os caminhos de escrita da aplicação. Alterar produto.estoque_disponivel diretamente por SQL, desabilitar triggers ou operar como superusuário não é uma operação auditada pela aplicação; utilize as APIs e trate importações como procedimento controlado. As proteções de histórico não são prova criptográfica nem proteção contra o proprietário/superusuário do banco. Antes de produção, usar usuário de banco com privilégios mínimos e procedimentos próprios de manutenção/reconciliação.

Não inclui lotes, validade, múltiplos depósitos, fornecedores, inventário físico, exportações ou alertas de estoque mínimo. Pagamentos, devoluções e estornos permanecem exclusivamente simulados.
