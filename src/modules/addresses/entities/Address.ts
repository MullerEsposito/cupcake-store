import 'reflect-metadata';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'endereco', schema: 'public' })
export class Address {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id!: string;

  @Column({ name: 'usuario_id', type: 'bigint' })
  userId!: string;

  @Column({ name: 'destinatario', type: 'varchar', length: 150 })
  recipient!: string;

  @Column({ name: 'cep', type: 'varchar', length: 8 })
  postalCode!: string;

  @Column({ name: 'logradouro', type: 'varchar', length: 200 })
  street!: string;

  @Column({ name: 'numero', type: 'varchar', length: 20 })
  number!: string;

  @Column({ name: 'complemento', type: 'varchar', length: 150, nullable: true })
  complement!: string | null;

  @Column({ name: 'bairro', type: 'varchar', length: 100 })
  district!: string;

  @Column({ name: 'cidade', type: 'varchar', length: 100 })
  city!: string;

  @Column({ name: 'uf', type: 'varchar', length: 2 })
  state!: string;

  @Column({ name: 'ativo', type: 'boolean', default: true })
  active!: boolean;
}
