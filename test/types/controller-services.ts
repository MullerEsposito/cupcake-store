import type { GetProductController } from '../../src/modules/catalog/useCases/getProduct/GetProductController.js';
import type { GetProductService } from '../../src/modules/catalog/useCases/getProduct/GetProductService.js';
import type { ListProductsController } from '../../src/modules/catalog/useCases/listProducts/ListProductsController.js';
import type { ListProductsService } from '../../src/modules/catalog/useCases/listProducts/ListProductsService.js';
import type { AuthenticateUserController } from '../../src/modules/users/useCases/authenticateUser/AuthenticateUserController.js';
import type { AuthenticateUserService } from '../../src/modules/users/useCases/authenticateUser/AuthenticateUserService.js';
import type { GetCurrentUserController } from '../../src/modules/users/useCases/getCurrentUser/GetCurrentUserController.js';
import type { GetCurrentUserService } from '../../src/modules/users/useCases/getCurrentUser/GetCurrentUserService.js';
import type { LogoutUserController } from '../../src/modules/users/useCases/logoutUser/LogoutUserController.js';
import type { LogoutUserService } from '../../src/modules/users/useCases/logoutUser/LogoutUserService.js';
import type { RegisterUserController } from '../../src/modules/users/useCases/registerUser/RegisterUserController.js';
import type { RegisterUserService } from '../../src/modules/users/useCases/registerUser/RegisterUserService.js';

type Expect<Condition extends true> = Condition;
type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2) ? true : false;

export type GetProductControllerReceivesItsService = Expect<Equal<ConstructorParameters<typeof GetProductController>[0], GetProductService>>;
export type ListProductsControllerReceivesItsService = Expect<Equal<ConstructorParameters<typeof ListProductsController>[0], ListProductsService>>;
export type AuthenticateUserControllerReceivesItsService = Expect<Equal<ConstructorParameters<typeof AuthenticateUserController>[0], AuthenticateUserService>>;
export type GetCurrentUserControllerReceivesItsService = Expect<Equal<ConstructorParameters<typeof GetCurrentUserController>[0], GetCurrentUserService>>;
export type LogoutUserControllerReceivesItsService = Expect<Equal<ConstructorParameters<typeof LogoutUserController>[0], LogoutUserService>>;
export type RegisterUserControllerReceivesItsService = Expect<Equal<ConstructorParameters<typeof RegisterUserController>[0], RegisterUserService>>;

export type CurrentUserControllerNeedsOnlyService = Expect<Equal<ConstructorParameters<typeof GetCurrentUserController>, [GetCurrentUserService]>>;

export type RegisterControllerHasNoSessionStore = Expect<Equal<ConstructorParameters<typeof RegisterUserController>, [RegisterUserService, string]>>;
export type LoginControllerHasNoSessionStore = Expect<Equal<ConstructorParameters<typeof AuthenticateUserController>, [AuthenticateUserService, string]>>;
