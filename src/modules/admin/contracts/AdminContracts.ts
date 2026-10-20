import type { OrderDTO } from '../../orders/contracts/OrderContracts.js';
import type { OrderStatus } from '../../orders/entities/order-status.js';

export interface PageInput { page: number }
export interface OrderFilter extends PageInput { status?: OrderStatus }
export interface Page<T> { items: T[]; page: number; pageSize: number; total: number }
export interface ProductFields {
  categoryId: string; name: string; description: string; price: string; weight: string; image: string; active: boolean;
}
export interface ProductWrite extends ProductFields { initialStock?: number; revision?: string }
export interface AdminProduct extends ProductFields { id: string; stock: number; revision: string }
export interface CategoryWrite { name: string; description: string | null; active: boolean; revision?: string }
export interface AdminCategory extends CategoryWrite { id: string; revision: string }
export interface AdminCatalog { products: Page<AdminProduct>; categories: AdminCategory[] }
export interface StockAdjustment { expectedStock: number; delta: number; reason: string }
export interface OrderTransition { expectedStatus: OrderStatus; status: OrderStatus }
export interface AdminOrder extends OrderDTO { customer: { id: string; name: string; email: string } }
