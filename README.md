# CupCake Store

Primeiro incremento funcional: HU-01 (vitrine), HU-02 (detalhes), HU-09 (cadastro) e HU-10 (login). Interface React com TypeScript, Vite e Axios; backend TypeScript em Node.js 20.19+ com Express 5, organizado por módulos de negócio (users e catalog), com entidades, repositórios e Service/Controller/composição por caso de uso, usando TypeORM com PostgreSQL. Casos de uso e regras de negócio são independentes de Express, React e banco. Consulte [Arquitetura](docs/architecture.md) para a estrutura modular, contratos e decisões. O banco existente é reutilizado e nenhuma tabela é apagada ou recriada. As nove tabelas devem estar no esquema public do banco cupcake_store.

## Sprint 2

Busca por nome/descrição, filtros por categoria e faixa de preço, carrinho de visitante e carrinho persistido do cliente, com incorporação após login. Quantidades e totais são validados no servidor; não há reserva nem baixa de estoque antes do checkout. Consulte [Sprint 2](docs/sprint-2.md) para endpoints, limites e critérios de verificação.

Diagnóstico com PostgreSQL real: `npm run check:sprint2`. Os dados fictícios são revertidos com ROLLBACK; sequências podem avançar. O checkout e os pagamentos permanecem fora desta entrega.

## Configuração local

1. Abra a raiz deste repositório em um terminal e execute `npm ci` para instalar as dependências registradas.
2. Copie `.env.example` para `.env`. Preencha `PGPASSWORD` no seu editor local com a senha do PostgreSQL. Não envie a senha pelo chat e não publique esse arquivo.
3. Execute `npm run check:db`. O resultado esperado é conexão com cupcake_store e nove tabelas presentes.
4. Execute `npm start`: o frontend React será compilado e servido com a API em http://localhost:3000. Use esse endereço, não o IP 127.0.0.1, pois a proteção de origem valida a URL exata.

No Windows, depois de configurar o .env, também é possível abrir `iniciar.cmd` para iniciar a aplicação. Mantenha a janela aberta durante o uso. O .env está ignorado pelo controle de versão e não é enviado ao GitHub. Ao clonar o repositório, crie sua configuração a partir de `.env.example`.

O servidor escuta somente na interface local. Para desenvolvimento com atualização React, execute `npm run dev` e abra http://localhost:5173; a API continua em 3000 por proxy. Mantenha PORT=3000 nesse modo e não execute duas instâncias na mesma porta. Para parar, pressione Ctrl+C. Não são necessárias alterações no DBeaver nem execução de migrações neste incremento. TypeORM usa o schema existente, com synchronize, dropSchema e migrationsRun desativados.

## Catálogo inicial

Se ainda não houver produtos, a vitrine mostra um estado vazio real. O arquivo `database/04-catalogo-desenvolvimento.sql` pode ser executado pelo DBeaver em cupcake_store para inserir quatro produtos fictícios identificados como dados de desenvolvimento. Imagens de demonstração usam uma ilustração local, sem afirmar que são fotografias dos produtos. Não são criados clientes, administradores, pedidos ou pagamentos nesse arquivo.

## Scripts do banco

Os arquivos em `database/` permitem reproduzir o ambiente. Para uma instalação nova, execute `00-criar-banco.sql` conectado a `postgres`, fora de transação. Depois conecte-se a `cupcake_store` e execute `pitii-modelo-fisico.sql` inteiro. Use `02-verificar-modelo-fisico.sql` para conferir a estrutura e `03-testar-restricoes.sql` para os testes revertidos com ROLLBACK. Não reaplique a criação inicial em uma base já implementada. O catálogo de desenvolvimento é opcional; nenhum dump de dados pessoais está incluído.

## Segurança e decisões deste incremento

- Senhas com 12–128 caracteres, salt aleatório e scrypt (N=32768, r=8, p=1). Senhas nunca aparecem em logs ou respostas. Cadastros sempre recebem perfil CLIENTE, independentemente de campos enviados pelo navegador.
- Email normalizado e único; consultas parametrizadas; validação de entradas no servidor. Login e cadastro têm limite de 20 solicitações por minuto por IP.
- Política proposta para o protótipo: cinco tentativas inválidas bloqueiam a conta por 15 minutos. O registro é atualizado com bloqueio de linha para evitar contagem perdida em tentativas simultâneas. Contas inativas não entram.
- Sessões opacas aleatórias em cookie HttpOnly e SameSite=Strict, com validade fixa de oito horas. O servidor guarda apenas o hash do identificador e revalida se o usuário está ativo. Logout invalida a sessão; reiniciar o processo encerra todas as sessões. Sessões em memória atendem apenas este protótipo local de processo único; persistência compartilhada é necessária antes de escalar.
- Operações POST exigem origem exata e cabeçalho próprio; sem CORS permissivo. Página usa CSP, dados são inseridos com textContent e imagens externas admitem somente HTTPS.
- HTTPS e cookies Secure são necessários antes de publicar. Este servidor é destinado ao ambiente local; não há implantação pública ou conexão remota ao PostgreSQL.

## Verificação

`npm run typecheck` valida os tipos do backend, frontend e contratos. `npm test` executa testes automatizados de validação, hash, sessão, contratos HTTP e controle de tentativas. Esses testes isolam o acesso ao banco com um DataSource simulado; não comprovam integração com seu servidor PostgreSQL. `npm run check:db` verifica a conexão TypeORM, as nove tabelas e as consultas dos repositórios após preencher o .env.

Teste manual com o banco conectado: inserir catálogo, consultar vitrine e detalhes; cadastrar um email novo, sair e entrar; rejeitar email repetido; errar a senha cinco vezes e observar bloqueio; verificar usuario.senha_hash e campos de tentativas pelo DBeaver. Não envie hashes ou credenciais em evidências públicas.

## Próximos incrementos

Sprint 2: busca, filtros, carrinho e resumo implementados. Próximas etapas — Sprint 3: endereço, checkout e pagamento simulado com baixa transacional de estoque. Sprint 4: acompanhamento e painel administrador. Os fluxos das Sprints 3 e 4 não estão implementados nesta entrega. O login não é apresentado como compra concluída e nenhum pagamento é realizado.
