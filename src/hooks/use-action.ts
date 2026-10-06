'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Result<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Runs a Server Action that returns an ActionResult and tracks its state:
 * idle → loading → success | error. On success the current route is refreshed
 * so server-rendered data reflects the change.
 */
export function useAction<A extends unknown[], T>(action: (...args: A) => Promise<Result<T>>, { refresh = true } = {}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const run = (...args: A): Promise<Result<T>> => new Promise(resolve => {
    setError(''); setFieldErrors({});
    startTransition(async () => {
      let result: Result<T>;
      try {
        result = await action(...args);
      } catch {
        result = { ok: false, error: 'Something went wrong. Please try again.' };
      }
      if (result.ok) {
        setState('success');
        if (refresh) router.refresh();
      } else {
        setState('error');
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
      }
      resolve(result);
    });
  });

  const reset = () => { setState('idle'); setError(''); setFieldErrors({}); };

  return { run, reset, pending, state: pending ? 'loading' as const : state, error, fieldErrors };
}
