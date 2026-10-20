import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '#entities/User';
import { Product } from '#entities/Product';
import { Category } from '#entities/Category';
import { Cart } from '#entities/Cart';
import { CartItem } from '#entities/CartItem';
import { errorCode } from '#shared/errors/error-info';

export function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'cupcake_store',
    username: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD,
    schema: 'public',
    entities: [User, Product, Category, Cart, CartItem],
    synchronize: false,
    dropSchema: false,
    migrationsRun: false,
    logging: false,
    connectTimeoutMS: 3000,
    applicationName: 'cupcake_store',
    poolErrorHandler: error => console.error('Conexão PostgreSQL interrompida:', errorCode(error)),
    extra: { max: 5, statement_timeout: 5000 }
  });
}

export const AppDataSource = createDataSource();
