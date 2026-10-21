import { describe, expect, it } from 'vitest';
import { passwordProblem } from '@/lib/auth/crypto';
import { generatePassword } from '@/lib/auth/password-generator';

describe('generatePassword', () => {
  it('creates readable passwords that meet the password policy', () => {
    const passwords = Array.from({ length: 1000 }, generatePassword);
    for (const p of passwords) {
      expect(p).toMatch(/^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/\d/);
      expect(p).not.toMatch(/[0O1lIo]/);
      expect(passwordProblem(p)).toBeNull();
    }
    expect(new Set(passwords).size).toBe(passwords.length);
  });
});
