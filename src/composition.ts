import type { DataSource } from 'typeorm';
import type { RuntimeDependencies } from './adapters/http/dependencies.js';
import { Sessions, hashPassword, verifyPassword } from './infrastructure/security/primitives.js';

export function composeDependencies(dataSource: DataSource): RuntimeDependencies {
  return {
    dataSource,
    passwords: { hash: hashPassword, verify: verifyPassword },
    sessions: new Sessions()
  };
}
