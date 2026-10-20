import type { InventoryFilter, InventoryPage } from '../contracts/InventoryContracts.js';

export interface IInventoryRepository {
  list(userId: string, input: InventoryFilter): Promise<InventoryPage>;
}
