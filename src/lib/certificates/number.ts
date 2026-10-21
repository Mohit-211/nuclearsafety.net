import { randomInt } from 'node:crypto';

/*
 * Certificate numbers in the format of the client's existing certificates: three groups
 * of 11, 9 and 10 capital letters, e.g. CLPPBDVBNPF-ZVGVLGQGS-XCPXRPPPXH. Consonants
 * only, so a number never spells a word; ~130 random bits, so numbers cannot be guessed.
 */

const LETTERS = 'BCDFGHJKLMNPQRSTVWXZ';
const GROUPS = [11, 9, 10];

export const CERTIFICATE_NUMBER_PATTERN = /^[BCDFGHJKLMNPQRSTVWXZ]{11}-[BCDFGHJKLMNPQRSTVWXZ]{9}-[BCDFGHJKLMNPQRSTVWXZ]{10}$/;

export function generateCertificateNumber(): string {
  return GROUPS.map(length => Array.from({ length }, () => LETTERS[randomInt(LETTERS.length)]).join('')).join('-');
}
