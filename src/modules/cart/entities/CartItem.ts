import 'reflect-metadata';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { Product } from '#entities/Product';

@Entity({ name: 'item_carrinho', schema: 'public' })
export class CartItem {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS', primaryKeyConstraintName: 'item_carrinho_pkey' })
  id!: string;

  @Column({ name: 'carrinho_id', type: 'bigint' })
  cartId!: string;

  @Column({ name: 'produto_id', type: 'bigint' })
  productId!: string;

  @Column({ name: 'quantidade', type: 'integer' })
  quantity!: number;

  @ManyToOne(() => Product, { nullable: false, onDelete: 'RESTRICT', cascade: false })
  @JoinColumn({ name: 'produto_id', referencedColumnName: 'id', foreignKeyConstraintName: 'item_carrinho_produto_id_fkey' })
  product!: Relation<Product>;
}
