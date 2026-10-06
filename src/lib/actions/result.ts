import 'server-only';
import { z } from 'zod';
import { AuthError } from '@/lib/auth/current-user';

/** Error whose message is safe to show to the user. */
export class UserError extends Error {
  constructor(message: string, public fieldErrors?: Record<string, string>) { super(message); }
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Wraps a Server Action body: converts validation, permission and user-facing
 * errors into a serialisable result, and logs (but hides) unexpected errors.
 * `redirect()`/`notFound()` errors are re-thrown so Next.js can handle them.
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof UserError) return { ok: false, error: err.message, fieldErrors: err.fieldErrors };
    if (err instanceof AuthError) return { ok: false, error: err.message };
    if (err instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of err.issues) {
        const key = issue.path.join('.') || 'form';
        fieldErrors[key] ??= issue.message;
      }
      return { ok: false, error: Object.values(fieldErrors)[0] ?? 'Check the highlighted fields.', fieldErrors };
    }
    if (isNextControlFlow(err)) throw err;
    if (isDuplicateKey(err)) return { ok: false, error: 'A record with these details already exists.' };
    console.error('[action] unexpected error', err);
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}

function isNextControlFlow(err: unknown) {
  const digest = (err as { digest?: unknown })?.digest;
  return typeof digest === 'string' && (digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_HTTP_ERROR_FALLBACK') || digest === 'NEXT_NOT_FOUND');
}

export function isDuplicateKey(err: unknown) {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === 'ER_DUP_ENTRY' || e?.cause?.code === 'ER_DUP_ENTRY';
}

/** Shared zod helpers. */
export const zId = z.coerce.number().int().positive();
export const zEmail = z.string().trim().toLowerCase().email('Enter a valid email address.').max(255);
export const zName = z.string().trim().min(1, 'Enter a name.').max(160);
export const zOptionalText = (max: number) => z.string().trim().max(max).transform(v => v || null).nullable().optional();
