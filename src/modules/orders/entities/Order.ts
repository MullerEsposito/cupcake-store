import 'reflect-metadata';
import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity({ name: 'pedido', schema: 'public' })
export class Order {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id!: string;

  @Column({ name: 'numero', type: 'varchar', length: 40 })
  number!: string;

  @Column({ name: 'usuario_id', type: 'bigint' })
  userId!: string;

  @Column({ name: 'endereco_id', type: 'bigint' })
  addressId!: string;

  @Column({ name: 'status', type: 'varchar', length: 25 })
  status!: string;

  @Column({ name: 'entrega_destinatario', type: 'varchar', length: 150 })
  recipient!: string;

  @Column({ name: 'entrega_cep', type: 'varchar', length: 8 })
  postalCode!: string;

  @Column({ name: 'entrega_logradouro', type: 'varchar', length: 200 })
  street!: string;

  @Column({ name: 'entrega_numero', type: 'varchar', length: 20 })
  addressNumber!: string;

  @Column({ name: 'entrega_complemento', type: 'varchar', length: 150, nullable: true })
  complement!: string | null;

  @Column({ name: 'entrega_bairro', type: 'varchar', length: 100 })
  district!: string;

  @Column({ name: 'entrega_cidade', type: 'varchar', length: 100 })
  city!: string;

  @Column({ name: 'entrega_uf', type: 'varchar', length: 2 })
  state!: string;

  @Column({ name: 'subtotal', type: 'numeric', precision: 12, scale: 2 })
  subtotal!: string;

  @Column({ name: 'frete', type: 'numeric', precision: 12, scale: 2 })
  shipping!: string;

  @Column({ name: 'total', type: 'numeric', precision: 12, scale: 2 })
  total!: string;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamptz' })
  createdAt!: Date;
}
