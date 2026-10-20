import 'reflect-metadata';
import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity({ name: 'pagamento', schema: 'public' })
export class Payment {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id!: string;

  @Column({ name: 'pedido_id', type: 'bigint' })
  orderId!: string;

  @Column({ name: 'metodo', type: 'varchar', length: 10 })
  method!: string;

  @Column({ name: 'status', type: 'varchar', length: 10 })
  status!: string;

  @Column({ name: 'valor', type: 'numeric', precision: 12, scale: 2 })
  amount!: string;

  @Column({ name: 'processado_em', type: 'timestamptz', nullable: true })
  processedAt!: Date | null;

  @Column({ name: 'chave_idempotencia', type: 'varchar', length: 128 })
  idempotencyKey!: string;

  @Column({ name: 'simulado', type: 'boolean', default: true })
  simulated!: boolean;

  @Column({ name: 'motivo_resultado', type: 'text', nullable: true })
  reason!: string | null;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamptz' })
  createdAt!: Date;
}
