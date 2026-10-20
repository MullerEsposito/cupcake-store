# Sprint 6 — páginas e estilos modularizados

## Escopo

Substituir a composição em página única por páginas React com endereços próprios, mantendo a identidade creme/rosa e as funcionalidades das Sprints 1–5. Não altera contratos da API, esquema do banco, estoque ou regras de cancelamento/estorno.

## Rotas

| Endereço | Página | Acesso |
| --- | --- | --- |
| / | Início | Público |
| /produtos | Catálogo, busca e filtros | Público |
| /produtos/:id | Detalhes do cupcake | Público |
| /sobre | Nossa essência e contexto acadêmico | Público |
| /carrinho | Carrinho de visitante ou cliente | Público |
| /entrar | Login e cadastro | Público |
| /checkout | Endereço e confirmação do pedido | Autenticado |
| /pedidos | Histórico de pedidos | Autenticado |
| /pedidos/:id | Resumo, acompanhamento, pagamento e cancelamento | Proprietário, validado na API |
| /administracao | Produtos, categorias, estoque e pedidos | ADMIN |

A navegação usa Link/NavLink; os controles de voltar/avançar do navegador e recargas funcionam. Os links antigos com fragmentos (#catalogo, #carrinho, #pedidos, #sobre e #administracao) não possuem redirecionamento de compatibilidade; utilize os novos endereços. Há estado de página não encontrada na navegação React. O servidor devolve 404 para endereços não reconhecidos.

## Organização

- presentation/pages: um diretório por página, com index.tsx; estilos exclusivos em styles.tsx quando necessários.
- presentation/components: componentes reutilizáveis, cada qual em seu diretório com index.tsx e styles.tsx.
- presentation/styles: tema, reset e primitivas compartilhadas; os estilos específicos permanecem próximos dos componentes.
- StorefrontContext: sessão, carrinho, catálogo/filtros e notificações persistem durante a navegação.
- presentation/routes: controle de acesso e comportamento de navegação/foco/título.

styled-components já inclui suas tipagens. React Router é usado em modo declarativo; não há novo framework de servidor nem mudança na arquitetura em camadas do backend. O componente de fluxo de pedidos é compartilhado pelas três páginas para preservar idempotência, recuperação de pagamentos e acompanhamento.

## Regras preservadas

Carrinhos de visitante e cliente continuam somando quantidades após login, uma única incorporação por transição de sessão. Login permanece obrigatório somente para checkout/conta; o acesso ao checkout aguarda a conclusão da incorporação do carrinho. Filtros aplicados permanecem ao sair e voltar ao catálogo.

Pedido confirmado redireciona ao próprio resumo; pagamentos pendentes podem ser retomados pelo histórico. Frete grátis, pagamentos e estornos exclusivamente simulados. Estoque é confirmado pelo servidor, não pelo estado da interface. Cliente e ADMIN só podem cancelar até a preparação, com motivo e confirmação. Navegação não deve executar pagamentos, cancelamentos ou ajustes automaticamente.

Redirecionamento após login aceita somente caminho interno, bloqueando URLs externas e caminhos com barras invertidas/caracteres de controle. A guarda de rota não substitui autorização na API. Saída da conta remove o conteúdo restrito.

## Segurança dos estilos

O Express gera um nonce criptográfico por resposta HTML, envia style-src self com esse nonce na CSP e o inclui no meta sc-nonce. styled-components 6.6 consome esse meta ao criar seus elementos style. Não são liberados unsafe-inline ou scripts externos. HTML não é armazenado em cache; assets versionados mantêm cache imutável. A API e arquivos inexistentes não são convertidos em HTML por fallback.

## Verificação

Execute npm test, npm run typecheck e npm run build. Os testes desta sprint verificam separação de páginas, acesso por perfil, redirecionamentos internos, estilos encapsulados e entrega HTTP com nonce único. Os testes existentes continuam verificando contratos, pagamentos, autorização e cancelamentos.

Na porta 3000, validar:
1. Início não contém catálogo, carrinho, pedidos ou painel administrativo.
2. Abrir catálogo, aplicar filtro, ver detalhe, voltar e preservar o filtro.
3. Navegar entre páginas e usar voltar/avançar sem recarregar sessão/carrinho.
4. Recarregar diretamente /produtos, /carrinho e /administracao.
5. Visitante em /checkout ou /pedidos vai ao login; cliente comum não vê o painel.
6. Login inválido mantém mensagem e formulário; login válido retorna ao destino.
7. Conferir checkout e resumo em páginas próprias, inclusive pagamento pendente/cancelamento.
8. Conferir navegação acessível em tela estreita, foco, títulos e estados de erro/vazio.

Não usar pedidos reais para demonstrar cancelamento nem alterar estoque real para evidências visuais. Depois de reiniciar o backend, é necessário entrar novamente porque as sessões do protótipo ficam em memória.
