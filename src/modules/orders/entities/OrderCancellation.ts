import 'reflect-metadata';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'cancelamento_pedido', schema: 'public' })
export class OrderCancellation {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id!: string;

  @Column({ name: 'pedido_id', type: 'bigint' })
  orderId!: string;

  @Column({ name: 'usuario_id', type: 'bigint' })
  actorId!: string;

  @Column({ name: 'perfil_usuario', type: 'varchar', length: 10 })
  actorRole!: string;

  @Column({ name: 'status_anterior', type: 'varchar', length: 25 })
  previousStatus!: string;

  @Column({ name: 'motivo', type: 'varchar', length: 500 })
  reason!: string;

  @Column({ name: 'chave_idempotencia', type: 'varchar', length: 128 })
  idempotencyKey!: string;

  @Column({ name: 'pagamento_id', type: 'bigint', nullable: true })
  paymentId!: string | null;

  @Column({ name: 'status_estorno', type: 'varchar', length: 20 })
  refundStatus!: string;

  @Column({ name: 'valor_estorno', type: 'numeric', precision: 12, scale: 2 })
  refundAmount!: string;

  @Column({ name: 'estornado_em', type: 'timestamptz', nullable: true })
  refundedAt!: Date | null;

  @Column({ name: 'estoque_reposto', type: 'boolean' })
  stockRestored!: boolean;

  @Column({ name: 'simulado', type: 'boolean', default: true })
  simulated!: boolean;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamptz' })
  createdAt!: Date;
}
