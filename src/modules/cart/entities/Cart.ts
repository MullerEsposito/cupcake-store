import 'reflect-metadata';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'carrinho', schema: 'public' })
export class Cart {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS', primaryKeyConstraintName: 'carrinho_pkey' })
  id!: string;

  @Column({ name: 'usuario_id', type: 'bigint', nullable: true })
  userId!: string | null;

  @Column({ name: 'token_sessao', type: 'varchar', length: 128, nullable: true })
  guestHash!: string | null;

  @Column({ name: 'estado', type: 'varchar', length: 12, default: 'ATIVO' })
  state!: 'ATIVO' | 'CONVERTIDO' | 'ABANDONADO';

  @CreateDateColumn({ name: 'criado_em', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'atualizado_em', type: 'timestamptz' })
  updatedAt!: Date;
}
