import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '#entities/User';
import { Product } from '#entities/Product';
import { Category } from '#entities/Category';
import { Cart } from '#entities/Cart';
import { CartItem } from '#entities/CartItem';
import { Address } from '#entities/Address';
import { Order } from '#entities/Order';
import { OrderItem } from '#entities/OrderItem';
import { Payment } from '#entities/Payment';
import { OrderCancellation } from '#entities/OrderCancellation';
import { CreateOrderCancellations1792454400000 } from './migrations/1792454400000-CreateOrderCancellations.js';
import { StockMovement } from '#entities/StockMovement';
import { CreateStockMovements1792537200000 } from './migrations/1792537200000-CreateStockMovements.js';
import { errorCode } from '#shared/errors/error-info';

export function createDataSource(): DataSource {
  const remote = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : undefined;
  if (process.env.VERCEL === '1' && !remote) throw new Error('DATABASE_URL obrigatória na Vercel.');
  if (remote && !['postgres:', 'postgresql:'].includes(remote.protocol)) throw new Error('Protocolo PostgreSQL inválido.');
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) remote?.searchParams.delete(key);
  return new DataSource({
    type: 'postgres',
    ...(remote ? { url: remote.toString(), ssl: { rejectUnauthorized: true } } : {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE || 'cupcake_store',
      username: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD
    }),
    schema: 'public',
    entities: [User, Product, Category, Cart, CartItem, Address, Order, OrderItem, Payment, OrderCancellation, StockMovement],
    migrations: [CreateOrderCancellations1792454400000, CreateStockMovements1792537200000],
    synchronize: false,
    dropSchema: false,
    migrationsRun: false,
    logging: false,
    connectTimeoutMS: 3000,
    applicationName: 'cupcake_store',
    poolErrorHandler: error => console.error('Conexão PostgreSQL interrompida:', errorCode(error)),
    extra: { max: remote ? 3 : 5, idleTimeoutMillis: 10000, statement_timeout: 5000 }
  });
}

export const AppDataSource = createDataSource();
