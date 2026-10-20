# Contrato do repositório de produtos

Interface `IProductsRepository.ts` recebida diretamente pelos serviços.

- `listActive()`: retorna uma lista de produtos ativos; uma lista vazia é válida.
- `findActiveById(id)`: retorna um produto ativo ou null.

Formato público: id, name, description, price, weight, image, stock, category e category_id. Os tipos retornados pelo driver e o contrato HTTP existente são preservados, inclusive preço decimal como string.

`implementations/typeorm/ProductsRepository.ts` usa Repository e QueryBuilder do TypeORM, com filtros parametrizados e mapeamento único em modules/catalog/entities/. Validação do identificador e decisão de produto inexistente pertencem ao domínio e ao caso de uso. Não há dependência de Express nem obrigação de herança.

O adaptador ProductsRepository não recebe parâmetros. Seu construtor obtém Repository<T> pelo getter centralizado, após a conexão ser inicializada. O serviço continua dependendo somente da interface; as fábricas constroem o adaptador sem argumentos.

Os construtores usam a classe decorada como EntityTarget, sem EntitySchema: getRepository(User) ou getRepository(Product). A entidade decorada fica em modules/catalog/entities/Product.ts; ProductDTO preserva o contrato público de consulta.

IProductsRepository retorna ProductDTO, não a relação Category serializada. ProductDTO.category é o nome público da categoria; Product.category é o relacionamento TypeORM.
