export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: string;
  weight: number;
  image: string | null;
  stock: number;
  category: string;
  category_id: string;
}
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: string;
}
export interface AuthInput { email: string; password: string; name?: string }
export type AuthMode = 'login' | 'register';
export interface CatalogFilters { q?: string; category?: string; minPrice?: string; maxPrice?: string }
export interface CartLine {
  productId: string; name: string; quantity: number; unitPrice: string; lineTotal: string; stock: number; available: boolean;
}
export interface Cart { items: CartLine[]; total: string; totalQuantity: number; warnings: string[] }
export interface StorefrontApi {
  products(signal?: AbortSignal, filters?: CatalogFilters): Promise<Product[]>;
  product(id: string, signal?: AbortSignal): Promise<Product>;
  session(signal?: AbortSignal): Promise<PublicUser | null>;
  login(input: AuthInput): Promise<PublicUser>;
  register(input: AuthInput): Promise<PublicUser>;
  logout(): Promise<{ message: string }>;
  cart(signal?: AbortSignal): Promise<Cart>;
  addCartItem(productId: string, quantity: number): Promise<Cart>;
  setCartQuantity(productId: string, quantity: number): Promise<Cart>;
  removeCartItem(productId: string): Promise<Cart>;
  mergeCart(): Promise<Cart>;
}
export interface Resource<T> {
  data: T | null;
  error: string;
  loading: boolean;
  retry(): void;
}
export type Authenticate = (mode: AuthMode, input: AuthInput) => Promise<void>;
