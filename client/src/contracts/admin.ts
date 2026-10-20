import type { InventoryFilter, InventoryPage } from './inventory';
import type { Order } from './storefront';
import type { CancellationInput } from './cancellation';

export interface ProductFields {
  categoryId: string; name: string; description: string; price: string; weight: string; image: string; active: boolean;
}
export interface ProductWrite extends ProductFields { initialStock?: number; revision?: string }
export interface AdminProduct extends ProductFields { id: string; stock: number; revision: string }
export interface CategoryWrite { name: string; description: string | null; active: boolean; revision?: string }
export interface AdminCategory extends CategoryWrite { id: string; revision: string }
export interface Page<T> { items: T[]; page: number; pageSize: number; total: number }
export interface AdminCatalog { products: Page<AdminProduct>; categories: AdminCategory[] }
export interface AdminOrder extends Order { customer: { id: string; name: string; email: string } }
export interface AdminApi {
  adminCatalog(page: number, signal?: AbortSignal): Promise<AdminCatalog>;
  saveProduct(id: string | null, input: ProductWrite): Promise<AdminProduct>;
  saveCategory(id: string | null, input: CategoryWrite): Promise<AdminCategory>;
  adjustStock(id: string, input: { expectedStock: number; delta: number; reason: string }): Promise<AdminProduct>;
  stockMovements(page: number, filters: InventoryFilter, signal?: AbortSignal): Promise<InventoryPage>;
  adminOrders(page: number, status: string, signal?: AbortSignal): Promise<Page<AdminOrder>>;
  advanceOrder(id: string, input: { expectedStatus: string; status: string }): Promise<AdminOrder>;
  adminCancelOrder(id: string, input: CancellationInput): Promise<Order>;
}
