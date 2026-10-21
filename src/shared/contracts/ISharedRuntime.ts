export interface ISharedRuntime {
  consumeRateLimit(identity: string, maximum: number): Promise<void>;
  orderVersion(userId: string): Promise<string>;
  announceOrder(userId: string): Promise<void>;
  acquireOrderStream(userId: string): Promise<() => Promise<void>>;
}
