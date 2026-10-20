import type { AdminCatalog, AdminProduct, AdminCategory, AdminOrder, PageInput, Page, OrderFilter,
  ProductWrite, CategoryWrite, StockAdjustment, OrderTransition } from '../contracts/AdminContracts.js';

export interface IAdministrationRepository {
  catalog(userId: string, input: PageInput): Promise<AdminCatalog>;
  saveProduct(userId: string, id: string | undefined, input: ProductWrite): Promise<AdminProduct>;
  saveCategory(userId: string, id: string | undefined, input: CategoryWrite): Promise<AdminCategory>;
  adjustStock(userId: string, id: string, input: StockAdjustment): Promise<AdminProduct>;
  orders(userId: string, input: OrderFilter): Promise<Page<AdminOrder>>;
  advanceOrder(userId: string, id: string, input: OrderTransition): Promise<AdminOrder>;
}
