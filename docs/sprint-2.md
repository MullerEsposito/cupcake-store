# Sprint 2 — busca, filtros e carrinho

## Escopo

- Busca por nome ou descrição, sem diferenciar maiúsculas e minúsculas.
- Filtros combináveis por categoria e preços mínimo/máximo, com limpeza e estado sem resultados.
- Carrinho de visitante em cookie opaco HttpOnly/SameSite=Strict, sem exigir login.
- Carrinho do cliente persistido no PostgreSQL e incorporação do carrinho visitante após login/cadastro.
- Inclusão, alteração de quantidade, remoção e resumo com preços atuais calculados no servidor.

O checkout continua exigindo login e pertence à Sprint 3, junto de endereço, frete, pedido, pagamento simulado e baixa transacional de estoque. Adicionar ao carrinho não reserva estoque nem conclui compra.

## Decisões e limites

- O banco existente é reutilizado. Cart e CartItem mapeiam carrinho e item_carrinho; synchronize, migrationsRun e dropSchema permanecem desativados.
- O navegador recebe somente um token aleatório; token_sessao armazena seu SHA-256, nunca o token em claro. O cookie visitante tem duração de 30 dias; o descarte de registros antigos é uma tarefa operacional futura.
- Usuário e carrinho não são escolhidos pelo corpo da requisição. A identidade vem dos middlewares resolveSession e resolveCart; contas autenticadas são revalidadas como ativas no serviço.
- Há um carrinho ativo por proprietário, com no máximo 100 produtos diferentes e 99 unidades de cada produto. Quantidades acima do estoque são rejeitadas.
- Alterações e incorporação usam transações TypeORM com advisory locks por proprietário, adquiridos em ordem determinística. A criação concorrente respeita também os índices únicos existentes. As leituras de estoque nas alterações usam bloqueio compartilhado do produto; não há decremento de estoque nesta sprint.
- A incorporação soma quantidades, limita ao estoque e aos limites definidos e devolve avisos de ajustes. Produtos indisponíveis do visitante são ignorados com aviso. O carrinho de origem fica ABANDONADO, não CONVERTIDO, e seu cookie é apagado. Repetir a incorporação não duplica itens.
- O resumo usa centavos inteiros com BigInt. Preços enviados pelo navegador são ignorados. Itens cujo estoque mudou permanecem visíveis com aviso, permitindo ajuste ou remoção.
- As alterações são POST com proteção de origem/cabeçalho já existente. Há limite separado de 120 operações por minuto por IP para carrinho, sem consumir o limite de autenticação.
- O frontend reconsulta o carrinho após mudança de conta e não exibe o estado da conta anterior. Incorporações duplicadas pelo StrictMode compartilham a mesma operação em andamento.
- A busca trata %, _ e barra invertida como caracteres literais e usa parâmetros SQL. Não há pesquisa por equivalência de acentos nem paginação neste incremento. O seletor de categorias é derivado dos produtos ativos do catálogo inicial.

## API

- GET /api/products?q=chocolate&category=1&minPrice=10.00&maxPrice=20.00
- GET /api/cart
- POST /api/cart/items com productId e quantity
- POST /api/cart/items/:id/quantity com quantity
- POST /api/cart/items/:id/remove com objeto vazio
- POST /api/cart/merge com objeto vazio, somente autenticado

Respostas do carrinho têm cart.items, total, totalQuantity e warnings. O total é o subtotal dos produtos, sem frete. Tokens, hashes e IDs de carrinhos não são devolvidos.

## Verificação

- npm run typecheck e npm run build verificam tipos e geram frontend/backend.
- node --import tsx --test test/sprint2.test.mjs cobre validação, parâmetros SQL, centavos, autorização, cookie e gateway Axios.
- npm run check:sprint2 valida repositories e endpoints com PostgreSQL real. Cria dados fictícios dentro de uma transação externa; operações usam savepoints e o comando termina com ROLLBACK. Como sequências PostgreSQL não são transacionais, podem existir lacunas de IDs, sem registros de teste persistidos.
- Fluxo manual: buscar Chocolate, combinar preço/categoria, limpar filtros, adicionar como visitante, mudar quantidade, recarregar, entrar e verificar incorporação; sair e confirmar que o carrinho do cliente não aparece como visitante.
- As verificações antigas da Sprint 1 foram atualizadas: a arquitetura resolve os aliases com o compilador TypeScript e continua bloqueando HTTP, ORM e implementações concretas no núcleo; HttpError é verificado em errors; as fábricas verificam os nomes reais dos serviços injetados. Um teste de regressão comprova que aliases proibidos ou inexistentes continuam rejeitados.

## Fora de escopo

Checkout, frete, endereço, pedido, pagamento, administração, reserva/baixa de estoque e limpeza automática de carrinhos antigos não foram implementados.
