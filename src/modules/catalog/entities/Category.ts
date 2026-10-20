import 'reflect-metadata';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'categoria', schema: 'public' })
export class Category {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS', primaryKeyConstraintName: 'categoria_pkey' })
  id!: string;

  @Column({ name: 'nome', type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'descricao', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'ativo', type: 'boolean', default: true })
  active!: boolean;
}
