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
export interface StorefrontApi {
  products(signal?: AbortSignal): Promise<Product[]>;
  product(id: string, signal?: AbortSignal): Promise<Product>;
  session(signal?: AbortSignal): Promise<PublicUser | null>;
  login(input: AuthInput): Promise<PublicUser>;
  register(input: AuthInput): Promise<PublicUser>;
  logout(): Promise<{ message: string }>;
}
export interface Resource<T> {
  data: T | null;
  error: string;
  loading: boolean;
  retry(): void;
}
export type Authenticate = (mode: AuthMode, input: AuthInput) => Promise<void>;
