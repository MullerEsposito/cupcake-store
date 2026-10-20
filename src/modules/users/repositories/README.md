# Contrato do repositório de usuários

Interface `IUsersRepository.ts` recebida diretamente pelos serviços. Não depende de Express ou PostgreSQL.

- `createClient({ name, email, passwordHash })`: cria exclusivamente um CLIENTE e retorna o usuário; e-mail duplicado resulta em ApplicationError CONFLICT.
- `findActiveById(id)`: retorna usuário ativo ou null.
- `withLockedUser(email, operation)`: executa `operation(userOrNull, saveLoginState)` dentro de transação com bloqueio de linha; confirma o resultado normal e reverte exceções.
- `saveLoginState(id, { failedAttempts, blockedUntil })`: persiste o estado na mesma transação.

Formato do usuário: id, name, email, role; na autenticação também passwordHash, active, failedAttempts e blockedUntil. `presentUser` seleciona somente os quatro campos públicos.

`implementations/typeorm/TypeOrmUsersRepository.ts` declara implements e implementa o contrato. Testes injetam objetos que implementam apenas as operações necessárias. Uma futura implementação em memória ou outro banco deve respeitar os mesmos contratos e semântica transacional; a implementação usa TypeORM, sem sincronização automática do schema.

O adaptador TypeOrmUsersRepository não recebe parâmetros. Seu construtor obtém Repository<T> pelo getter centralizado, após a conexão ser inicializada. O serviço continua dependendo somente da interface; as fábricas constroem o adaptador sem argumentos.

Os construtores usam a classe decorada como EntityTarget, sem EntitySchema: getRepository(User) ou getRepository(Product). A entidade decorada fica em modules/users/entities/User.ts; PublicUserDTO define a resposta pública.

IUsersRepository retorna a única entidade User. Os serviços aplicam presentUser, definido em dtos/PublicUserDTO.ts, antes de retornar respostas HTTP. Não existe outra interface User duplicando a entidade.
