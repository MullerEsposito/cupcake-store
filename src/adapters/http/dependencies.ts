import type { DataSource } from 'typeorm';
import type { ISharedRuntime } from '../../shared/contracts/ISharedRuntime.js';
import type { Clock, IPasswordHasher, ISessions } from '#shared/contracts/ISecurity';

export interface RuntimeDependencies {
  dataSource: DataSource;
  passwords: IPasswordHasher;
  sessions: ISessions;
  clock?: Clock;
  sharedRuntime?: ISharedRuntime;
}
export interface ControllerDependencies extends RuntimeDependencies {
  origin: string;
}
