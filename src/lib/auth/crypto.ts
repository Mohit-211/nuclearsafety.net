import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/*
 * Password hashing with Node's built-in scrypt (no native dependency).
 * Stored format: scrypt$N$r$p$saltB64$hashB64
 */

const N = 16384, R = 8, P = 1, KEYLEN = 64;

function scrypt(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => scryptCb(password, salt, keylen, opts, (err, key) => err ? reject(err) : resolve(key)));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize('NFKC'), salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return ['scrypt', N, R, P, salt.toString('base64'), hash.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [algo, n, r, p, saltB64, hashB64] = stored.split('$');
  if (algo !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length,
    { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** A fixed dummy hash so login spends the same time whether or not the email exists. */
let dummyHash: Promise<string> | undefined;
export function dummyPasswordHash() {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'));
  return dummyHash;
}

/** URL-safe random token (256 bits). */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export const PASSWORD_MIN_LENGTH = 10;

/** Returns an error message, or null when the password is acceptable. */
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (password.length > 200) return 'Use at most 200 characters.';
  return null;
}
