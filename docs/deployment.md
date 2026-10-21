# Demonstração na Vercel

O banco Neon `cupcake-store-demo` é independente do PostgreSQL local. Nunca enviar o `.env` local, dados reais ou dumps ao provedor. O plano autorizado é Free, região São Paulo.

Demonstração pública: https://cupcake-store-gamma.vercel.app. O projeto Vercel `cupcake-store` está conectado a `MullerEsposito/cupcake-store`, com produção na branch `main`. Os domínios de preview continuam sob a proteção padrão da Vercel; utilizar o endereço público acima, que é a origem configurada na aplicação.

## Configuração

Na Vercel, configurar `DATABASE_URL` com a conexão Neon e `APP_ORIGIN` com a origem HTTPS exata da aplicação, sem barra final. Credenciais ficam somente nas variáveis protegidas. O servidor rejeita publicação sem essas variáveis e valida o certificado TLS do PostgreSQL. Não definir `VITE_DATABASE_URL`.

O build `npm run build:vercel` gera assets em `dist` e o handler em `build/server`. O HTML é servido pela função para receber o nonce CSP; não fica exposto como template estático. As rotas diretas de React passam pelo Express; assets são entregues pelo CDN. A execução local continua usando `npm start` e a porta 3000.

## Estado compartilhado

O esquema técnico `app_runtime` contém sessões, limites de requisições, revisões de pedidos e concessões de conexões SSE. Não faz parte das onze entidades de negócio. Tokens e identificadores de IP são representados por hash; sessões expiram em oito horas. Contas inativas continuam bloqueadas pelos middlewares.

Os limites são atualizados com UPSERT atômico. O cabeçalho de IP da plataforma só é considerado quando `VERCEL=1`; fora da plataforma vale o endereço da conexão. Sessões não desaparecem em um cold start. Não há cache de usuário autenticado no CDN.

Na nuvem, cada conexão SSE consulta a revisão compartilhada a cada dois segundos, com reconexão a cada quatro minutos, antes do limite da função. Isso é invalidação periódica via SSE, não push direto do PostgreSQL e não GPS. A consulta de contingência do navegador continua ativa. Cotas de três conexões por usuário e cem no total são compartilhadas por trava transacional e concessões com expiração de cinco minutos. Uma falha na gravação do sinal não desfaz uma compra já confirmada; o navegador recupera o estado pela consulta de contingência.

## Antes de liberar

Provisionar o esquema inicial somente no banco dedicado vazio, aplicar migrations de negócio e `database/05-demo-runtime.sql`, inserir catálogo e contas fictícios. Não iniciar sincronização automática de esquema. Validar login entre instâncias, logout, pagamento, cancelamento, estoque e auditoria; testar URLs diretas e HTTPS. O ambiente só estará concluído depois de existir uma URL pública validada.

Não executar scripts de criação inicial no banco local existente. Não há reset automático, exportação de dados pessoais ou contratação de plano pago.

## Validação realizada

Foram aprovados 153 testes locais, checagem TypeScript e build. Na publicação, foram verificados URLs diretas, assets, CSP com nonce, cadastro, sessão, autorização CLIENTE/ADMIN, ViaCEP, municípios IBGE, checkout, recusa e aprovação de pagamento, repetição idempotente, cancelamento com estorno simulado, recomposição do estoque e consulta de auditoria. Os registros gerados são fictícios e permanecem identificados como validação técnica; não representam avaliações dos colegas.

`scripts/check-demo.mjs` recebe a origem pública como argumento e usa a conta fictícia do arquivo local `.env.demo-accounts.local`; não imprime a senha. O provisionamento inicial `scripts/provision-demo.ts` exige confirmação explícita de recurso e banco, aceita somente host Neon e banco vazio e recusa reset. As credenciais são geradas aleatoriamente e salvas em arquivo local ignorado pelo Git.
