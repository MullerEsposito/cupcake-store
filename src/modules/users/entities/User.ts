import 'reflect-metadata';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'usuario', schema: 'public' })
export class User {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS', primaryKeyConstraintName: 'usuario_pkey' })
  id!: string;

  @Column({ name: 'nome', type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 254, unique: true })
  email!: string;

  @Column({ name: 'senha_hash', type: 'text', select: false })
  passwordHash!: string;

  @Column({ name: 'perfil', type: 'varchar', length: 10, default: 'CLIENTE' })
  role!: string;

  @Column({ name: 'ativo', type: 'boolean', default: true })
  active!: boolean;

  @Column({ name: 'tentativas_falhas', type: 'integer', default: 0 })
  failedAttempts!: number;

  @Column({ name: 'bloqueado_ate', type: 'timestamptz', nullable: true })
  blockedUntil!: Date | null;
}
