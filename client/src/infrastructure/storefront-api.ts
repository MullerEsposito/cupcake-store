import type { AxiosInstance } from 'axios';
import type { StorefrontApi, Product, PublicUser } from '../contracts/storefront';
import { createHttpClient } from './http-client';

export function createStorefrontApi(client: Pick<AxiosInstance, 'get' | 'post'> = createHttpClient()): StorefrontApi {
  return {
    products: async signal => (await client.get<{ products: Product[] }>('/products', { signal })).data.products,
    product: async (id, signal) => (await client.get<{ product: Product }>(`/products/${encodeURIComponent(id)}`, { signal })).data.product,
    session: async signal => (await client.get<{ user: PublicUser | null }>('/session', { signal })).data.user,
    login: async input => (await client.post<{ user: PublicUser }>('/login', input)).data.user,
    register: async input => (await client.post<{ user: PublicUser }>('/register', input)).data.user,
    logout: async () => (await client.post<{ message: string }>('/logout', {})).data
  };
}
