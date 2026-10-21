/*
 * Random passwords for admins to share with learners, e.g. "Kq7m-Xp4t-Wz9h".
 * Client-safe (Web Crypto). Look-alike characters (0/O/o, 1/l/I) are left out so a
 * password can be read out or copied from paper without mistakes.
 */

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const ALPHABET = UPPER + LOWER + DIGITS;

/** Uniform random integer in [0, n), without modulo bias. */
function randomBelow(n: number): number {
  const limit = Math.floor(0x1_0000_0000 / n) * n;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf); while (buf[0]! >= limit);
  return buf[0]! % n;
}

/** Three groups of four characters with upper case, lower case and a digit (~70 bits). */
export function generatePassword(): string {
  for (;;) {
    const chars = Array.from({ length: 12 }, () => ALPHABET[randomBelow(ALPHABET.length)]).join('');
    if (/[A-Z]/.test(chars) && /[a-z]/.test(chars) && /\d/.test(chars)) return chars.match(/.{4}/g)!.join('-');
  }
}
