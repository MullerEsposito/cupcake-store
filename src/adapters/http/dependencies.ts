import type { DataSource } from 'typeorm';
import type { Clock, IPasswordHasher, ISessions } from '#shared/contracts/ISecurity';

export interface RuntimeDependencies {
  dataSource: DataSource;
  passwords: IPasswordHasher;
  sessions: ISessions;
  clock?: Clock;
}
export interface ControllerDependencies extends RuntimeDependencies {
  origin: string;
}
