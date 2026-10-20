# Arquitetura da CupCake Store

## Organização por funcionalidade

O backend é uma API REST em Express organizada por módulos de negócio, seguindo a referência de entidades, repositórios e casos de uso. REST descreve a interface HTTP; a organização modular define como o código interno divide responsabilidades. Backend e frontend usam TypeScript estrito com módulos ESM, PostgreSQL e React. A persistência usa TypeORM com PostgreSQL.

```text
src/
  modules/
    users/
      entities/
        User.ts
        credentials.ts
        login-policy.ts
      repositories/
        README.md
        implementations/typeorm/UsersRepository.ts
      useCases/
        registerUser/
          RegisterUserController.ts
          RegisterUserService.ts
          index.ts
        authenticateUser/
        getCurrentUser/
        logoutUser/
    catalog/
      entities/Product.ts
      repositories/
        README.md
        implementations/typeorm/ProductsRepository.ts
      useCases/
        listProducts/
        getProduct/
  shared/errors/ApplicationError.ts
  adapters/http/
    routes/index.ts
    routes/auth.routes.ts
    routes/catalog.routes.ts
    middlewares/
    server.ts
  infrastructure/
    typeorm/data-source.ts
    security/primitives.ts
  composition.ts
  main.ts
```

Cada pasta de caso de uso contém um Service, um Controller e um index.ts. Os testes continuam em `test/` para manter a convenção existente e são executados com `npm test`.

## Limpeza da estrutura

As antigas pastas application, domain, adapters/http/controllers e implementations/postgres não fazem parte da estrutura atual. Os adaptadores de persistência ativos ficam em implementations/typeorm; arquivos-fonte referenciados, contratos, testes e scripts do banco são preservados.

`npm run build` executa `clean:server` antes de compilar o backend, removendo exclusivamente a saída gerada em build/server. Isso evita manter JavaScript de repositórios removidos ou renomeados. O comando não limpa src, dist, configurações locais nem dados do banco e recusa diretórios vinculados nesse caminho.

## Responsabilidades e dependências

Fluxo: rota → fábrica do controlador → Controller.handle → Service.execute → contrato de repositório → implementação PostgreSQL.

- **Entidades e regras**: User, Product e Category são as únicas entidades dos módulos e possuem decorators TypeORM. Validação de credenciais e política de bloqueio ficam em credentials.ts e login-policy.ts; o catálogo valida identificadores em validators/validateProductId.ts. As respostas públicas e a projeção segura de usuário ficam em DTOs separados.
- **Services**: um serviço por caso de uso: RegisterUser, AuthenticateUser, GetCurrentUser, LogoutUser, ListProducts e GetProduct. Recebem dependências por construtor e expõem execute. Não importam Express, SQL ou implementações concretas.
- **Controllers**: adaptam request/response do Express e chamam o serviço. Cadastro e login compartilham somente o helper HTTP de escrita do cookie de sessão; regras de negócio não ficam nos controladores.
- **index.ts de cada caso de uso**: exporta o getter do controlador, importado diretamente pelo arquivo de rota, como na referência. Recebe somente os adaptadores necessários (senhas, sessões, origem e relógio), instancia o adaptador sem argumentos e o injeta no Service e injeta o Service no Controller. Logout não acessa banco e não cria repositório. Não recebe request nem acessa app.locals.
- **Repositórios**: cada módulo documenta sua porta estrutural em repositories/README.md. IProductsRepository e IUsersRepository definem contratos estáticos; as implementações PostgreSQL declaram implements. Serviços recebem a interface diretamente no construtor, com import type, sem importar classes concretas. A implementação PostgreSQL fica em repositories/implementations/typeorm. Objetos de teste substituem o banco em testes unitários.
- **Composição**: src/composition.ts conhece as implementações concretas, disponibiliza o DataSource compartilhado, sessões e adaptadores de senha com composeDependencies. Os index.ts dos casos de uso instanciam repositórios e serviços, conectando-os aos controladores. DataSource e sessões são reutilizados dentro da aplicação; repositórios, serviços e controladores são criados nas fábricas, sem abrir um novo DataSource por solicitação. Origem e limitador permanecem isolados por aplicação.
- **Compartilhado**: erros genéricos ficam em shared; DataSource TypeORM e primitivas de segurança permanecem na infraestrutura. Cookies, parser, resposta de erro, middleware e servidor ficam no adaptador HTTP.

A separação vale mesmo com arquivos próximos: as entidades têm acoplamento intencional ao TypeORM; serviços, DTOs e regras não importam controladores, Express, adaptadores ou implementações concretas. Controladores não acessam repositórios. Testes de arquitetura percorrem os módulos e verificam essas fronteiras e a estrutura de cada caso de uso. Somente as fábricas index.ts conhecem os repositórios concretos; os serviços continuam recebendo a porta por injeção. Testes HTTP usam um DataSource simulado para exercitar essa composição sem acessar o PostgreSQL real.

## Rotas e contratos preservados

`server.ts` importa diretamente `router` de routes/index.ts e monta em /api. O router raiz usa router.use para agregar auth.routes.ts em / e catalog.routes.ts em /products. As rotas importam getters dos casos de uso e invocam `getAuthenticateUserController(request.app.locals.dependencies).handle(request, response)`, por exemplo. Somente o adaptador de rota lê app.locals; o getter recebe um objeto de dependências independente de HTTP. request e response entram apenas em handle, com tipos Express. Não existe um registro de serviços ou repositórios pré-instanciados. O DataSource não é fornecido às fábricas; o middleware estabelece o contexto de conexão e somente os adaptadores de segurança necessários são passados às fábricas.

Endereços mantidos: GET /api/session, POST /api/register, POST /api/login, POST /api/logout, GET /api/products e GET /api/products/:id. Payloads, códigos HTTP e cookies permanecem iguais.

Express 5 encaminha rejeições assíncronas para o middleware de erros. Origem e limite de tentativas são verificados antes do parser. O corpo JSON é limitado a 8 KiB, não aceita compressão e precisa ser um objeto. Erros de parsing, tamanho e codificação recebem respostas 400/413/415, sem conteúdo sensível. O servidor serve somente dist e preserva cabeçalhos de segurança, 404 JSON e encerramento controlado.

## Segurança transacional

AuthenticateUserService recebe users, passwords, sessions e clock; a operação de login usa users.withLockedUser. O callback retorna um resultado de falha e o repositório confirma a atualização antes de o serviço lançar o erro. Exceções inesperadas revertem a transação e liberam a conexão. Isso preserva a contagem das tentativas e o bloqueio concorrente de conta.

RegisterUserService ignora perfil enviado pelo cliente e o repositório cria exclusivamente CLIENTE. A projeção pública seleciona id, name, email e role, sem hash. GetCurrentUserService reconsulta o usuário ativo. LogoutUserService revoga o token pelo contrato de sessões. A implementação em memória continua limitada a um processo e as sessões se encerram ao reiniciar.

## Frontend React

- `client/src/infrastructure/http-client.ts` cria uma instância Axios isolada com baseURL /api, timeout de 10 segundos, cookie HttpOnly via withCredentials, JSON e cabeçalho de proteção de origem. Um interceptor de resposta normaliza mensagens de erro, timeout e cancelamento. Cancelamentos viram AbortError para manter o contrato dos hooks. Não há retries automáticos, evitando repetir cadastros ou outras operações POST.
- `client/src/infrastructure/storefront-api.ts` usa essa instância Axios para os endpoints de catálogo e conta. Recebe um cliente HTTP opcional para testes. Nenhum componente conhece strings de endpoints ou acessa PostgreSQL. O Axios é cliente de requisições de saída; as requisições recebidas no backend continuam sob responsabilidade do servidor e de seus controllers.
- `client/src/presentation/hooks` coordena recursos assíncronos e a sessão. Efeitos abortam requisições e ignoram respostas antigas no cleanup, inclusive em StrictMode.
- `client/src/presentation/components` contém catálogo, detalhes, formulário, modal acessível e layout. Props e estado substituem construção manual de DOM. Formulários controlados, chaves estáveis, mensagens de erro, estados vazio/carregando e cleanup de timers permanecem explícitos.
- `App` compõe a tela e recebe o gateway por props. `main.tsx` liga a implementação HTTP à árvore React. Regras de credenciais e autorização são sempre revalidadas no servidor; não são duplicadas no navegador.

## Execução

Produção local: `npm start` compila com Vite e serve frontend e API em http://localhost:3000. `iniciar.cmd` executa o mesmo build e processo Node. Build separado: `npm run build`.

Desenvolvimento: `npm run dev` inicia API em 3000 e Vite em http://localhost:5173, com proxy de `/api`. O processo define APP_ORIGIN para 5173 sem reescrever a origem das requisições no proxy. Abra a interface em 5173 nesse modo. Não adicione APP_ORIGIN de desenvolvimento ao .env de produção local. As portas de desenvolvimento são fixas; mantenha PORT=3000 para esse comando.

Vite só expõe variáveis com prefixo VITE_ ao frontend. A configuração PG permanece no .env do servidor e nunca recebe esse prefixo. O build não lê nem contém a senha do PostgreSQL.

## Garantias e limites

URLs e payloads da API mantidos. Não há alteração no esquema ou nos dados do banco. Hash scrypt, perfil CLIENTE no cadastro, bloqueio de conta, cookies HttpOnly/SameSite, CSP e consultas parametrizadas permanecem. Sessões em memória continuam locais a um processo e são encerradas ao reiniciar.

`npm test` usa tsx para executar os testes de regressão JavaScript contra os fontes TypeScript. `npm run typecheck` verifica servidor, React, ferramentas e provas de contratos em test/types; `npm test` verifica casos de uso, contratos HTTP, infraestrutura transacional simulada, gateway do frontend e direção de dependências. Testes de unidade não substituem validação com PostgreSQL. `npm run check:db` verifica conexão e nove tabelas, sem modificar dados. A compilação React e a revisão no navegador complementam esses testes.

Na Sprint 1 não houve ampliação do escopo funcional. A Sprint 2 acrescenta busca, filtros e carrinho conforme docs/sprint-2.md; checkout, estoque transacional de pedidos, pagamentos e painel administrativo permanecem nos próximos incrementos.

## TypeScript

- `src/**/*.ts`: backend ESM, strict, NodeNext e imports locais relativos com extensão .js e aliases resolvidos pelo esbuild.
- `client/src/**/*.ts(x)`: React tipado, JSX react-jsx e resolução Bundler do Vite.
- `IProductsRepository`, `IUsersRepository`, `IPasswordHasher`, `ISessions`: contratos independentes das implementações.
- `constructor(private readonly productsRepository: IProductsRepository)`: o serviço conhece somente a porta; a fábrica instancia ProductsRepository e o injeta.
- Interfaces não substituem validação em runtime: credenciais entram como unknown e continuam validadas no servidor. Erros capturados também são tratados como unknown.
- `npm run build`: verifica tipos, gera o frontend em dist e empacota o servidor em build/server. `npm start` executa o backend compilado em Node 20.19+, sem precisar de tsx em produção.
- `npm run dev`: executa o servidor TypeScript com tsx/watch e o frontend com Vite. `npm run check:db` executa o diagnóstico TypeScript.
- Os testes existentes continuam em .mjs, com fixtures parciais para testar comportamento em runtime; test/types adiciona verificações de compilação dos contratos. Não foi usado any explícito, ts-ignore ou ts-nocheck para contornar a migração.

## Persistência TypeORM

- `createDataSource()` configura uma única conexão lógica TypeORM com pool PostgreSQL interno. A inicialização termina antes de app.listen; o encerramento chama destroy.
- `synchronize: false`, `dropSchema: false` e `migrationsRun: false`: não há criação, remoção ou alteração automática de tabelas. Os scripts SQL existentes continuam sendo a referência da instalação inicial.
- As classes User, Product e Category mapeiam `public.usuario`, `public.produto` e `public.categoria`, com nomes físicos explícitos, BIGINT/IDENTITY e tipos decimais preservados. As seis outras tabelas permanecem no banco e serão mapeadas quando seus casos de uso forem implementados.
- As classes decoradas ficam em modules/*/entities; serviços e DTOs não importam TypeORM em runtime. Os decorators possuem nomes e tipos físicos explícitos.
- UsersRepository e ProductsRepository implementam as mesmas interfaces. As fábricas instanciam os adaptadores sem parâmetros. Cada construtor obtém Repository<T> internamente com o getter centralizado, apoiado em DataSource.getRepository.
- Cadastro usa Repository.create/save, sempre com perfil CLIENTE. O código PostgreSQL 23505 continua sendo traduzido em conflito, sem expor o erro SQL.
- Login usa repository.manager.transaction e obtém um repositório transacional com manager.getRepository(repository.target) dentro do callback. O bloqueio pessimistic_write gera FOR UPDATE; atualizações das tentativas usam o mesmo manager transacional.
- A falha de credencial continua sendo retornada pelo callback, confirmando a atualização antes de o serviço lançar o erro de negócio. Exceções inesperadas causam rollback e liberação pelo TypeORM.
- senha_hash fica com select: false, sendo selecionada explicitamente apenas na autenticação. Logging SQL fica desativado para não registrar credenciais ou parâmetros sensíveis.
- O catálogo usa QueryBuilder, join com categoria, filtros parametrizados e ordenação por nome e id; getRawMany/getRawOne preservam os nomes públicos e os decimais da API.
- `npm run check:db` inicializa o DataSource, confere as nove tabelas, consulta o catálogo e valida consultas de usuário e bloqueio sem inserir, atualizar ou excluir dados.
- Testes unitários usam um DataSource simulado. Testes de metadata e geração de SQL usam o TypeORM real sem conexão ao banco. O diagnóstico separado verifica a integração real.
- Não utilize schema:sync ou geração/aplicação automática de migrações sobre esse banco sem revisar o impacto. Nenhuma migração de schema é necessária para esta troca de adaptador.

Os IDs usam @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' }), correspondendo às colunas IDENTITY existentes. Não use diferenças de schema geradas pelo ORM como migrações prontas: o modelo físico contém constraints, índices parciais e identidades que devem ser revisados explicitamente.

## Repositórios sem argumentos

`new ProductsRepository()` e `new UsersRepository()` obtêm o Repository nativo internamente. Serviços continuam dependendo apenas de IProductsRepository/IUsersRepository, recebendo os adaptadores por injeção.

O exemplo com getRepository importado diretamente de typeorm usa a API global antiga. No TypeORM 0.3, nosso getter em infrastructure/typeorm/repository-context.ts usa o DataSource atual, sem APIs globais legadas. Há dependência implícita de infraestrutura: remover o parâmetro não torna o adaptador independente do banco.

AppDataSource é a instância padrão, inicializada antes de app.listen. Os construtores não criam conexões, não inicializam pools e falham com erro UNAVAILABLE caso a conexão ainda não esteja pronta.

Para preservar o isolamento entre aplicações e testes, o middleware de /api delimita a conexão com AsyncLocalStorage. O getter usa a conexão desse contexto ou AppDataSource fora de requisições. withDataSource permite executar testes e rotinas com uma conexão explícita sem alterar estado global mutável. Contextos concorrentes e aninhados são isolados e restaurados automaticamente.

As fábricas de catálogo ficam sem argumentos, por exemplo:

```typescript
export function getListProductsController(): ListProductsController {
  const productsRepository = new ProductsRepository();
  const service = new ListProductsService(productsRepository);
  return new ListProductsController(service);
}
```

As fábricas de autenticação continuam recebendo somente senhas, sessões, origem e relógio quando necessários. Não recebem request nem DataSource.

O login continua usando repository.manager.transaction e manager.getRepository(repository.target), nunca o Repository global para consultas ou updates dentro do callback transacional. Commit de tentativas inválidas, rollback de falhas e bloqueio pessimista permanecem inalterados.

## Entidades decoradas como EntityTarget

Os três arquivos EntitySchema foram removidos. DataSource registra as classes User, Product e Category em entities, e os construtores passam essas classes diretamente para o getter: `this.repository = getRepository(Product)` e `this.repository = getRepository(User)`.

Os tipos ProductRecord/UserRecord/CategoryRecord também foram removidos. Os Repository<T> usam as classes decoradas. Os DTOs e regras permanecem sem dependência de runtime do ORM, e o retorno público do catálogo mantém os mesmos nomes, joins e valores decimais.

Os decorators @Entity, @Column, @PrimaryGeneratedColumn, @ManyToOne e @JoinColumn descrevem tabelas, colunas, defaults, geração de IDs e a relação produto–categoria. senha_hash permanece com select: false e só é incluída explicitamente na autenticação.

experimentalDecorators fica habilitado. emitDecoratorMetadata permanece desabilitado intencionalmente: todos os tipos de coluna e alvos de relação são explícitos, de forma que TypeORM não dependa de design:type. Isso mantém o mesmo comportamento no desenvolvimento/testes com tsx e no build com tsc. reflect-metadata é carregado pelas classes e pela configuração de conexão.

Não foi necessária migração ou sincronização do banco. Testes validam metadata real das classes, EntityTarget, IDENTITY ALWAYS, relação com categoria e seleção protegida da senha.

## Entidades únicas e DTOs públicos

A entidade decorada é a única definição de User, Product ou Category e fica em modules/users/entities ou modules/catalog/entities. Não existem cópias dessas classes em implementations/typeorm. É uma escolha pragmática para este projeto: as entidades conhecem TypeORM, sem alegar isolamento estrito do domínio.

- User.ts, Product.ts e Category.ts: mapeamento único de tabelas, campos e relacionamentos.
- users/dtos/PublicUserDTO.ts: contrato público e presentUser, com seleção explícita de id, name, email e role. Nunca retorna passwordHash, bloqueio ou contagem de tentativas.
- catalog/dtos/ProductDTO.ts: projeção do catálogo com category como nome e category_id como identificador. A entidade Product.category continua sendo a relação com Category.
- catalog/validators/validateProductId.ts: validação independente do mapeamento ORM.
- users/contracts/LoginState.ts: estado da política de bloqueio, sem duplicar a entidade User.
- IUsersRepository retorna a entidade User; os serviços fazem a projeção pública. IProductsRepository retorna ProductDTO para as consultas do catálogo.
- Services continuam dependendo das interfaces de repositório, e os controladores retornam somente DTOs.
- Os construtores continuam sem parâmetros e usam getRepository(User) ou getRepository(Product), agora importados das pastas entities dos módulos.

Nenhum endereço, payload, campo público, política de autenticação, dado ou schema do banco foi alterado. Testes de arquitetura asseguram uma única classe por entidade; testes de DTO verificam que senhas e campos internos não são serializados.

## Aliases por diretório

Os aliases ficam em compilerOptions.paths de tsconfig.base.json, compartilhado pelo TypeScript, tsx e esbuild. Não há mapeamentos por arquivo em package.json.

- #repositories/* procura, em ordem, nas implementações TypeORM de catalog e users; em seguida, nas pastas repositories dos dois módulos para localizar interfaces.
- #http/*, #shared/* e #infrastructure/* apontam para as respectivas pastas do backend.
- Serviços continuam importando somente interfaces; fábricas importam implementações. Imports relativos locais permanecem permitidos.

```ts
import type { IProductsRepository } from '#repositories/IProductsRepository';
import { ProductsRepository } from '#repositories/ProductsRepository';
import { UsersRepository } from '#repositories/UsersRepository';
```

npm run build mantém a verificação de tipos com tsc e usa esbuild para empacotar o backend ESM em build/server/main.js, resolvendo os aliases no build. Dependências npm, como TypeORM e pg, permanecem externas; o Node executa o resultado sem loader. keepNames preserva nomes de classes, e os decorators usam tipos de coluna explícitos, sem emitDecoratorMetadata.

Desenvolvimento, testes e check:db usam tsx com os mesmos paths, sem --conditions=development. Arquivos com nomes iguais são resolvidos pela ordem das pastas; use nomes únicos entre módulos para evitar colisões. Novos arquivos nessas pastas não exigem novos mapeamentos.

## Helpers HTTP

Os utilitários HTTP compartilhados ficam em src/adapters/http/helpers: authenticated-response.ts, session-cookie.ts, request-body.ts e response.ts. Os imports usam #http/helpers/<nome> ou caminhos relativos locais. server.ts, contratos, dependências, HttpError, rotas e middlewares permanecem em suas pastas atuais. A reorganização não altera endpoints, cookies, validações ou respostas de erro.

## Tipagem dos serviços nos controllers

Cada controller recebe no construtor a classe do seu serviço correspondente, como RegisterUserService ou ListProductsService. A dependência é importada com import type, sem adicionar carregamento em runtime; as fábricas continuam instanciando e injetando os serviços. Serviços permanecem dependentes das interfaces de repositório. A interface genérica IUseCase foi removida porque não possui mais consumidores. Testes de compilação verificam a associação entre os seis controllers e suas respectivas classes.

## Responsabilidades de sessão

RegisterUserService e AuthenticateUserService criam a nova sessão e revogam o token anterior somente após o sucesso da operação. No login, a criação ocorre após a confirmação da transação de autenticação, preservando o registro de falhas e o bloqueio de conta. Falhas de credenciais ou transação não criam sessões nem revogam a sessão anterior; se a criação falhar, o token anterior é preservado.

Os serviços retornam AuthenticationResult, com usuário público e token interno. Não conhecem cookies, Express ou origem HTTP. O helper authenticatedResponse grava o cookie HttpOnly/SameSite e serializa somente user: o token não vai no JSON. LogoutUserService continua revogando a sessão; o controller apenas limpa o cookie.

O middleware resolveSession lê o cookie e consulta a instância compartilhada de ISessions, obtida nas dependências da aplicação. Ele preenche request.authentication com token e userId, sem aceitar a identidade do corpo ou da query. Token ausente, inválido ou expirado resulta em userId null. GetCurrentUserController encaminha apenas o ID ao serviço, que reconsulta o usuário ativo. Nenhum controller recebe ISessions; o middleware é aplicado às quatro rotas de conta e a vitrine permanece pública. As fábricas continuam criando serviços e injetando-os nos controllers.

## Incremento da Sprint 2

O módulo cart segue a organização de entidades, contratos de repositório, implementações TypeORM e casos de uso com Service, Controller e fábrica. GetCart consulta o resumo; ChangeCart valida inclusão, quantidade e remoção; MergeCart incorpora o visitante ao cliente. Os controllers continuam tipados com a própria classe do serviço e os serviços dependem das interfaces ICartsRepository e IUsersRepository. Cart e CartItem são mapeadas no DataSource sem sincronização do schema.

resolveCart gera a identidade anônima em cookie opaco e armazena somente seu hash no contexto e no banco. A integração do frontend executa a incorporação após obter a sessão autenticada; o serviço de autenticação não passa a depender do módulo cart. As transações de carrinho serializam operações por proprietário e revalidam estoque, sem reservá-lo. Totais são calculados em centavos inteiros. HTTP mantém a proteção de origem e adiciona limite próprio para alterações no carrinho. Critérios, limites, rotas e diagnóstico transacional estão em docs/sprint-2.md.
