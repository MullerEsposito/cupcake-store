import type { EntityManager } from 'typeorm';
import { Product } from '#entities/Product';
import { StockMovement } from '../../../entities/StockMovement.js';
import { ApplicationError } from '#shared/errors/ApplicationError';
import type { MovementType } from '../../../contracts/InventoryContracts.js';

interface MovementOrigin {
  type: MovementType; reason: string; actorId: string | null; actorRole: string;
  origin: 'SISTEMA' | 'ADMINISTRATIVO'; orderId?: string; paymentId?: string; cancellationId?: string;
}

function requireTransaction(manager: EntityManager): void {
  if (!manager.queryRunner?.isTransactionActive) throw new Error('Auditoria exige uma transação ativa.');
}

async function append(manager: EntityManager, product: Product, previousStock: number, quantity: number, input: MovementOrigin): Promise<void> {
  await manager.save(StockMovement, manager.create(StockMovement, {
    productId: product.id, productName: product.name, previousStock, quantity, currentStock: previousStock + quantity,
    ...input, orderId: input.orderId ?? null, paymentId: input.paymentId ?? null, cancellationId: input.cancellationId ?? null
  }));
}

export async function recordInitialStock(manager: EntityManager, product: Product, actorId: string): Promise<void> {
  requireTransaction(manager);
  await append(manager, product, 0, product.stock, { type: 'INICIALIZACAO', reason: 'Estoque inicial no cadastro do produto.',
    actorId, actorRole: 'ADMIN', origin: 'ADMINISTRATIVO' });
}

export async function changeStock(manager: EntityManager, product: Product, quantity: number, input: MovementOrigin): Promise<void> {
  requireTransaction(manager);
  const currentStock = product.stock + quantity;
  if (!Number.isInteger(quantity) || quantity === 0 || !Number.isSafeInteger(currentStock) || currentStock < 0 || currentStock > 2147483647) {
    throw new ApplicationError('CONFLICT', 'A movimentação ultrapassa os limites do estoque.');
  }
  if (!await manager.existsBy(StockMovement, { productId: product.id })) {
    await append(manager, product, 0, product.stock, { type: 'ABERTURA',
      reason: 'Saldo de abertura observado antes da primeira movimentação auditada; histórico anterior não reconstruído.',
      actorId: null, actorRole: 'SISTEMA', origin: 'SISTEMA' });
  }
  const result = await manager.update(Product, { id: product.id, stock: product.stock }, { stock: currentStock });
  if (result.affected !== 1) throw new ApplicationError('CONFLICT', 'O estoque mudou. Atualize os dados antes de continuar.');
  await append(manager, product, product.stock, quantity, input);
  product.stock = currentStock;
}
