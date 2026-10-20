import type { AdminApi } from './admin';
import type { Cancellation, CancellationInput } from './cancellation';

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
export interface AddressInput {
  recipient: string; postalCode: string; street: string; number: string; complement: string | null;
  district: string; city: string; state: string;
}
export interface Address extends AddressInput { id: string }
export type PaymentMethod = 'PIX' | 'CARTAO' | 'BOLETO';
export type PaymentOutcome = 'APROVADO' | 'RECUSADO' | 'FALHA';
export interface CheckoutInput { addressId: string; method: PaymentMethod; idempotencyKey: string; expectedSubtotal: string }
export interface PaymentInput { method: PaymentMethod; outcome: PaymentOutcome; idempotencyKey: string }
export interface Order {
  id: string; number: string; status: string; createdAt: string;
  address: AddressInput; subtotal: string; shipping: string; total: string;
  items: { productId: string; name: string; quantity: number; unitPrice: string; lineTotal: string }[];
  payments: { id: string; method: string; status: string; amount: string; simulated: boolean; idempotencyKey: string; reason: string | null }[];
  cancellation: Cancellation | null;
}
export interface StorefrontApi extends AdminApi {
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
  addresses(signal?: AbortSignal): Promise<Address[]>;
  createAddress(input: AddressInput): Promise<Address>;
  orders(signal?: AbortSignal): Promise<Order[]>;
  order(id: string, signal?: AbortSignal): Promise<Order>;
  checkout(input: CheckoutInput): Promise<Order>;
  payOrder(id: string, input: PaymentInput): Promise<Order>;
  cancelOrder(id: string, input: CancellationInput): Promise<Order>;
}
export interface Resource<T> {
  data: T | null;
  error: string;
  loading: boolean;
  retry(): void;
}
export type Authenticate = (mode: AuthMode, input: AuthInput) => Promise<void>;
