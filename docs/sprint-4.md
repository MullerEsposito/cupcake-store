# Sprint 4 — acompanhamento e administração

## Escopo aprovado

- Cliente consulta somente seus pedidos, com indicador de progresso e atualização manual ou a cada 30 segundos enquanto a página estiver visível.
- Painel exclusivo para contas ativas com perfil `ADMIN`, com cadastro/edição e ativação/desativação de produtos e categorias.
- Ajustes de estoque positivos ou negativos, sem permitir saldo negativo ou valores acima do limite de `INTEGER`.
- Lista administrativa de pedidos, filtro por estado, detalhes da entrega e avanço até a conclusão.
- Cancelamento, estorno, integrações financeiras e transportadoras ficaram fora do escopo por decisão do projeto.

## Estados dos pedidos

`AGUARDANDO_PAGAMENTO` → pagamento simulado do cliente → `PAGAMENTO_APROVADO` → `EM_PREPARACAO` → `SAIU_PARA_ENTREGA` → `ENTREGUE`.

Somente o fluxo de pagamento da Sprint 3 pode aprovar o pagamento. O administrador avança uma etapa por vez após verificar que existe pagamento aprovado, simulado e com valor igual ao total do pedido. Não é possível pular etapas, voltar estados, concluir sem pagamento ou cancelar por estes endpoints. Avançar uma etapa novamente não repete efeitos; se o pedido já estiver além da etapa solicitada, a API retorna conflito.

O acompanhamento representa o **estado atual** registrado, não GPS, previsão de chegada ou histórico auditável de eventos. Etapas futuras não são apresentadas como concluídas. Não são inventadas datas de movimentação: o modelo atual registra apenas a criação do pedido.

## Arquitetura e autorização

O módulo `admin` segue Service/Controller/fábrica e o contrato `IAdministrationRepository`. Fábricas criam repositórios sem parâmetros, resolvidos pelo contexto TypeORM. Serviços não importam Express nem implementações concretas; controllers recebem a classe do serviço.

Cada serviço administrativo reconsulta o usuário ativo e seu perfil. O adaptador repete essa verificação dentro da transação com bloqueio de leitura do usuário, evitando que uma alteração de perfil no meio da operação invalide a autorização já verificada. A próxima requisição após revogação é bloqueada. Ocultar o painel no React é apenas apresentação, não a proteção de acesso. Perfil enviado no corpo, query ou cabeçalho não concede permissão.

Visitantes recebem 401, clientes recebem 403 e contas inativas recebem 401. A consulta de detalhes de um pedido alheio retorna 404. O cadastro público continua criando apenas clientes; não existe endpoint público para promover administradores.

## Edição, estoque e integridade

- Edição de produto/categoria usa revisão SHA-256 dos campos editáveis para rejeitar alterações sobre dados desatualizados. A revisão do produto não inclui estoque: pagamentos não invalidam a edição de nome/preço e a edição nunca usa um estoque enviado pelo formulário.
- Estoque inicial só é aceito no cadastro. Ajustes posteriores usam `expectedStock` e `delta`, com bloqueio do produto e comparação do saldo atual na mesma transação.
- Pagamentos e ajustes compartilham o bloqueio de linha do produto. Se uma compra modificar o estoque antes do ajuste, o saldo esperado desatualizado resulta em 409, sem sobrescrever a venda.
- Ajustes não têm chave persistente de idempotência nem livro de movimentações. Não há repetição automática de POST. Após qualquer falha, o formulário é descartado e o catálogo é recarregado; o operador deve conferir o saldo antes de iniciar outro ajuste. Essa comparação não equivale a uma garantia durável contra qualquer repetição de solicitação.
- Categorias com produtos ativos não podem ser desativadas. Produto ativo exige categoria ativa. Registros são preservados, sem exclusão física e sem alterar snapshots de pedidos anteriores.
- Avanços de pedidos usam bloqueio de linha e comparação com `expectedStatus`; não baixam estoque novamente.
- As nove tabelas existentes são reutilizadas, sem migração, `synchronize`, exclusão ou recriação do banco.

## Endpoints

| Método | Endpoint | Acesso |
| --- | --- | --- |
| GET | `/api/orders/:id` | Proprietário autenticado |
| GET | `/api/admin/catalog?page=1` | ADMIN |
| POST | `/api/admin/products` | ADMIN: cadastro |
| POST | `/api/admin/products/:id` | ADMIN: edição |
| POST | `/api/admin/products/:id/stock` | ADMIN: ajuste de estoque |
| POST | `/api/admin/categories` | ADMIN: cadastro |
| POST | `/api/admin/categories/:id` | ADMIN: edição |
| GET | `/api/admin/orders?page=1&status=ENTREGUE` | ADMIN: consulta |
| POST | `/api/admin/orders/:id/status` | ADMIN: avanço |

Produtos e pedidos administrativos são paginados em blocos de 20. Categorias são limitadas às primeiras 200, ordenadas por nome e ID; paginação de categorias fica como evolução. A lista do cliente mantém os últimos 50 pedidos, mas qualquer pedido próprio pode ser consultado diretamente pelo ID. Mutações usam JSON limitado, origem exata, cabeçalho da aplicação e o limite de mutações por IP já existente.

## Habilitação de administrador

Não há conta padrão, senha administrativa fixa ou promoção automática no início do servidor. A habilitação deve ser feita por um responsável pelo banco, somente para uma conta existente, ativa e explicitamente autorizada. A concessão é feita fora da API pública, alterando exclusivamente `usuario.perfil` para `ADMIN` em uma transação direcionada ao e-mail autorizado. Não compartilhe senha nem inclua credenciais em scripts versionados. Depois, atualize a sessão no navegador; se o servidor reiniciar, entre novamente.

## Validação

`npm run typecheck`, `npm test` e `npm run build` verificam compilação, arquitetura, contratos e interface. `npm run check:sprint4` exercita catálogo, revisões, estoque, estados, isolamento por proprietário e autorização no PostgreSQL, incluindo revogação de perfil e inativação de usuário. Os usuários (inclusive ADMIN), produtos e pedidos fictícios desse diagnóstico são revertidos com ROLLBACK; sequências podem avançar. Os diagnósticos das Sprints 2 e 3 permanecem como regressão.

Os testes do diagnóstico são sequenciais e não substituem carga concorrente com conexões independentes. Também não cobrem auditoria persistente, expiração automática de pedidos, cancelamento/estorno, gestão de usuários, relatórios financeiros nem produção distribuída. Sessões continuam em memória no processo local.
