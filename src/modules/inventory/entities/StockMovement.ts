import 'reflect-metadata';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { MovementType } from '../contracts/InventoryContracts.js';

@Entity({ name: 'movimentacao_estoque', schema: 'public' })
export class StockMovement {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id!: string;

  @Column({ name: 'produto_id', type: 'bigint' })
  productId!: string;

  @Column({ name: 'nome_produto', type: 'varchar', length: 150 })
  productName!: string;

  @Column({ name: 'tipo', type: 'varchar', length: 20 })
  type!: MovementType;

  @Column({ name: 'quantidade', type: 'integer' })
  quantity!: number;

  @Column({ name: 'saldo_anterior', type: 'integer' })
  previousStock!: number;

  @Column({ name: 'saldo_posterior', type: 'integer' })
  currentStock!: number;

  @Column({ name: 'motivo', type: 'varchar', length: 500 })
  reason!: string;

  @Column({ name: 'usuario_id', type: 'bigint', nullable: true })
  actorId!: string | null;

  @Column({ name: 'perfil_usuario', type: 'varchar', length: 10 })
  actorRole!: string;

  @Column({ name: 'origem', type: 'varchar', length: 20 })
  origin!: 'SISTEMA' | 'ADMINISTRATIVO';

  @Column({ name: 'pedido_id', type: 'bigint', nullable: true })
  orderId!: string | null;

  @Column({ name: 'pagamento_id', type: 'bigint', nullable: true })
  paymentId!: string | null;

  @Column({ name: 'cancelamento_id', type: 'bigint', nullable: true })
  cancellationId!: string | null;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamptz', default: () => 'clock_timestamp()' })
  createdAt!: Date;
}
