import type { AxiosInstance } from 'axios';
import type { StorefrontApi, Product, PublicUser, Cart, Address, Order } from '../contracts/storefront';
import { createHttpClient } from './http-client';

export function createStorefrontApi(client: Pick<AxiosInstance, 'get' | 'post'> = createHttpClient()): StorefrontApi {
  return {
    products: async (signal, filters) => (await client.get<{ products: Product[] }>('/products', { signal, params: filters })).data.products,
    product: async (id, signal) => (await client.get<{ product: Product }>(`/products/${encodeURIComponent(id)}`, { signal })).data.product,
    session: async signal => (await client.get<{ user: PublicUser | null }>('/session', { signal })).data.user,
    login: async input => (await client.post<{ user: PublicUser }>('/login', input)).data.user,
    register: async input => (await client.post<{ user: PublicUser }>('/register', input)).data.user,
    logout: async () => (await client.post<{ message: string }>('/logout', {})).data,
    cart: async signal => (await client.get<{ cart: Cart }>('/cart', { signal })).data.cart,
    addCartItem: async (productId, quantity) => (await client.post<{ cart: Cart }>('/cart/items', { productId, quantity })).data.cart,
    setCartQuantity: async (id, quantity) => (await client.post<{ cart: Cart }>(`/cart/items/${encodeURIComponent(id)}/quantity`, { quantity })).data.cart,
    removeCartItem: async id => (await client.post<{ cart: Cart }>(`/cart/items/${encodeURIComponent(id)}/remove`, {})).data.cart,
    mergeCart: async () => (await client.post<{ cart: Cart }>('/cart/merge', {})).data.cart,
    addresses: async signal => (await client.get<{ addresses: Address[] }>('/addresses', { signal })).data.addresses,
    createAddress: async input => (await client.post<{ address: Address }>('/addresses', input)).data.address,
    orders: async signal => (await client.get<{ orders: Order[] }>('/orders', { signal })).data.orders,
    checkout: async input => (await client.post<{ order: Order }>('/orders/checkout', input)).data.order,
    payOrder: async (id, input) => (await client.post<{ order: Order }>(`/orders/${encodeURIComponent(id)}/payments`, input)).data.order
  };
}
