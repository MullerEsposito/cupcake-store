import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function credentials(input, registering = false) {
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'Informe um e-mail válido.');
  }
  if (password.length > 128 || password.length < (registering ? 12 : 1)) {
    throw new HttpError(400, registering ? 'Use uma senha entre 12 e 128 caracteres.' : 'Informe sua senha.');
  }
  if (registering && (name.length < 2 || name.length > 150)) {
    throw new HttpError(400, 'Informe um nome entre 2 e 150 caracteres.');
  }
  return { email, password, name };
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64, options);
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  const parts = typeof encoded === 'string' ? encoded.split('$') : [];
  const valid = parts.length === 3 && parts[0] === 'scrypt' && /^[a-f0-9]{32}$/.test(parts[1]) && /^[a-f0-9]{128}$/.test(parts[2]);
  const salt = valid ? parts[1] : '00000000000000000000000000000000';
  const derived = await scrypt(password, salt, 64, options);
  const expected = valid ? Buffer.from(parts[2], 'hex') : Buffer.alloc(64);
  return timingSafeEqual(derived, expected) && valid;
}

export function publicUser(user) {
  return { id: user.id, name: user.nome, email: user.email, role: user.perfil };
}

export class Sessions {
  constructor({ ttl = 8 * 60 * 60 * 1000, max = 10000 } = {}) {
    this.entries = new Map();
    this.ttl = ttl;
    this.max = max;
  }

  digest(token) {
    return createHash('sha256').update(token).digest('hex');
  }

  create(userId) {
    this.prune();
    if (this.entries.size >= this.max) throw new HttpError(503, 'Tente novamente em alguns instantes.');
    const token = randomBytes(32).toString('hex');
    this.entries.set(this.digest(token), { userId, expires: Date.now() + this.ttl });
    return token;
  }

  get(token) {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const key = this.digest(token);
    const session = this.entries.get(key);
    if (!session || session.expires <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return session.userId;
  }

  delete(token) {
    if (token) this.entries.delete(this.digest(token));
  }

  prune() {
    for (const [key, value] of this.entries) if (value.expires <= Date.now()) this.entries.delete(key);
  }
}
