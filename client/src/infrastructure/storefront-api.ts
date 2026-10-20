import type { AxiosInstance } from 'axios';
import type { StorefrontApi, Product, PublicUser, Cart, Address, Order } from '../contracts/storefront';
import { createHttpClient } from './http-client';
import type { AdminCatalog, AdminProduct, AdminCategory, AdminOrder, Page } from '../contracts/admin';

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
    order: async (id, signal) => (await client.get<{ order: Order }>(`/orders/${encodeURIComponent(id)}`, { signal })).data.order,
    checkout: async input => (await client.post<{ order: Order }>('/orders/checkout', input)).data.order,
    payOrder: async (id, input) => (await client.post<{ order: Order }>(`/orders/${encodeURIComponent(id)}/payments`, input)).data.order,
    adminCatalog: async (page, signal) => (await client.get<{ catalog: AdminCatalog }>('/admin/catalog', { signal, params: { page } })).data.catalog,
    saveProduct: async (id, input) => (await client.post<{ product: AdminProduct }>(id ? `/admin/products/${encodeURIComponent(id)}` : '/admin/products', input)).data.product,
    saveCategory: async (id, input) => (await client.post<{ category: AdminCategory }>(id ? `/admin/categories/${encodeURIComponent(id)}` : '/admin/categories', input)).data.category,
    adjustStock: async (id, input) => (await client.post<{ product: AdminProduct }>(`/admin/products/${encodeURIComponent(id)}/stock`, input)).data.product,
    adminOrders: async (page, status, signal) => (await client.get<{ orders: Page<AdminOrder> }>('/admin/orders', { signal, params: { page, ...(status ? { status } : {}) } })).data.orders,
    advanceOrder: async (id, input) => (await client.post<{ order: AdminOrder }>(`/admin/orders/${encodeURIComponent(id)}/status`, input)).data.order
  };
}
