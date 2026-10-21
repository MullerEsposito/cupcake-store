export type Clock = () => number;
export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, encoded: string | null): Promise<boolean>;
}
export interface ISessions {
  create(userId: string): string | Promise<string>;
  get(token: string | undefined): string | null | Promise<string | null>;
  delete(token: string | undefined): void | Promise<void>;
}
