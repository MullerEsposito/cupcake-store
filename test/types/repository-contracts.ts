import type { PublicUserDTO } from '../../src/modules/users/dtos/PublicUserDTO.js';
import type { ProductDTO } from '../../src/modules/catalog/dtos/ProductDTO.js';
import type { IProductsRepository } from '#repositories/IProductsRepository';
import type { IUsersRepository } from '#repositories/IUsersRepository';
import type { ProductsRepository } from '#repositories/ProductsRepository';
import type { UsersRepository } from '#repositories/UsersRepository';
import type { ListProductsService } from '../../src/modules/catalog/useCases/listProducts/ListProductsService.js';
import type { GetProductService } from '../../src/modules/catalog/useCases/getProduct/GetProductService.js';
import type { RegisterUserService } from '../../src/modules/users/useCases/registerUser/RegisterUserService.js';
import type { AuthenticateUserService } from '../../src/modules/users/useCases/authenticateUser/AuthenticateUserService.js';
import type { GetCurrentUserService } from '../../src/modules/users/useCases/getCurrentUser/GetCurrentUserService.js';

type Expect<Condition extends true> = Condition;
type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2) ? true : false;
type ConstructorInput<Constructor extends abstract new (...args: never[]) => unknown> = ConstructorParameters<Constructor>[0];

export type ProductsImplementation = Expect<ProductsRepository extends IProductsRepository ? true : false>;
export type UsersImplementation = Expect<UsersRepository extends IUsersRepository ? true : false>;
export type ListDependsOnPort = Expect<Equal<ConstructorInput<typeof ListProductsService>, IProductsRepository>>;
export type DetailDependsOnPort = Expect<Equal<ConstructorInput<typeof GetProductService>, IProductsRepository>>;
export type RegisterDependsOnPort = Expect<Equal<ConstructorInput<typeof RegisterUserService>, IUsersRepository>>;
export type LoginDependsOnPort = Expect<Equal<ConstructorInput<typeof AuthenticateUserService>, IUsersRepository>>;
export type SessionDependsOnPort = Expect<Equal<ConstructorInput<typeof GetCurrentUserService>, IUsersRepository>>;
export type RejectIncompleteRepository = Expect<Equal<{ listActive(): Promise<[]> } extends IProductsRepository ? true : false, false>>;

export type ProductsAdapterHasNoArguments = Expect<Equal<ConstructorParameters<typeof ProductsRepository>, []>>;
export type UsersAdapterHasNoArguments = Expect<Equal<ConstructorParameters<typeof UsersRepository>, []>>;

export type PublicUserHasOnlySafeFields = Expect<Equal<keyof PublicUserDTO, 'id' | 'name' | 'email' | 'role'>>;
export type ProductCategoryIsPublicName = Expect<Equal<ProductDTO['category'], string>>;
