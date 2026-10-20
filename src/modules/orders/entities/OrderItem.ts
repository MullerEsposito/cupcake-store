import 'reflect-metadata';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'item_pedido', schema: 'public' })
export class OrderItem {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id!: string;

  @Column({ name: 'pedido_id', type: 'bigint' })
  orderId!: string;

  @Column({ name: 'produto_id', type: 'bigint' })
  productId!: string;

  @Column({ name: 'quantidade', type: 'integer' })
  quantity!: number;

  @Column({ name: 'preco_unitario', type: 'numeric', precision: 12, scale: 2 })
  unitPrice!: string;

  @Column({ name: 'nome_produto_snapshot', type: 'varchar', length: 150 })
  name!: string;
}
