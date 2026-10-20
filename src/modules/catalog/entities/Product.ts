import 'reflect-metadata';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { Category } from './Category.js';

@Entity({ name: 'produto', schema: 'public' })
export class Product {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS', primaryKeyConstraintName: 'produto_pkey' })
  id!: string;

  @Column({ name: 'categoria_id', type: 'bigint' })
  categoryId!: string;

  @Column({ name: 'nome', type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'descricao', type: 'text' })
  description!: string;

  @Column({ name: 'preco', type: 'numeric', precision: 12, scale: 2 })
  price!: string;

  @Column({ name: 'peso_gramas', type: 'numeric', precision: 10, scale: 3 })
  weight!: string;

  @Column({ name: 'imagem_url', type: 'text' })
  image!: string;

  @Column({ name: 'ativo', type: 'boolean', default: true })
  active!: boolean;

  @Column({ name: 'estoque_disponivel', type: 'integer', default: 0 })
  stock!: number;

  @ManyToOne(() => Category, { nullable: false, onDelete: 'RESTRICT', cascade: false })
  @JoinColumn({ name: 'categoria_id', referencedColumnName: 'id', foreignKeyConstraintName: 'produto_categoria_id_fkey' })
  category!: Relation<Category>;
}
