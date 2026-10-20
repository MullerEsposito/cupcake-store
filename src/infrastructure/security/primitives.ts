import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import type { ISessions } from '#shared/contracts/ISecurity';
import { ApplicationError } from '#shared/errors/ApplicationError';


const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function scrypt(password: string, salt: string, length: number, settings: typeof options): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, length, settings, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}


export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64, options);
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, encoded: string | null): Promise<boolean> {
  const parts = typeof encoded === 'string' ? encoded.split('$') : [];
  const valid = parts.length === 3 && parts[0] === 'scrypt' && /^[a-f0-9]{32}$/.test(parts[1]) && /^[a-f0-9]{128}$/.test(parts[2]);
  const salt = valid ? parts[1] : '00000000000000000000000000000000';
  const derived = await scrypt(password, salt, 64, options);
  const expected = valid ? Buffer.from(parts[2], 'hex') : Buffer.alloc(64);
  return timingSafeEqual(derived, expected) && valid;
}

interface SessionEntry { userId: string; expires: number }

export class Sessions implements ISessions {
  readonly entries = new Map<string, SessionEntry>();
  private readonly ttl: number;
  private readonly max: number;
  constructor({ ttl = 8 * 60 * 60 * 1000, max = 10000 } = {}) {
    this.ttl = ttl;
    this.max = max;
  }

  digest(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  create(userId: string) {
    this.prune();
    if (this.entries.size >= this.max) throw new ApplicationError('UNAVAILABLE', 'Tente novamente em alguns instantes.');
    const token = randomBytes(32).toString('hex');
    this.entries.set(this.digest(token), { userId, expires: Date.now() + this.ttl });
    return token;
  }

  get(token: string | undefined) {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const key = this.digest(token);
    const session = this.entries.get(key);
    if (!session || session.expires <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return session.userId;
  }

  delete(token: string | undefined) {
    if (token) this.entries.delete(this.digest(token));
  }

  prune() {
    for (const [key, value] of this.entries) if (value.expires <= Date.now()) this.entries.delete(key);
  }
}
