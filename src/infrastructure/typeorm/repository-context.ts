import { AsyncLocalStorage } from 'node:async_hooks';
import type { DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { AppDataSource } from './data-source.js';
import { ApplicationError } from '#shared/errors/ApplicationError';

const context = new AsyncLocalStorage<DataSource>();

export function withDataSource<Result>(dataSource: DataSource, operation: () => Result): Result {
  return context.run(dataSource, operation);
}

export function getRepository<Entity extends ObjectLiteral>(target: EntityTarget<Entity>): Repository<Entity> {
  const dataSource = context.getStore() ?? AppDataSource;
  if (!dataSource.isInitialized) {
    throw new ApplicationError('UNAVAILABLE', 'Conexão com o banco ainda não foi inicializada.');
  }
  return dataSource.getRepository(target);
}
