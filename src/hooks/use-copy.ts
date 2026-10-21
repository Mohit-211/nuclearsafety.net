'use client';

import { useState } from 'react';

/** Copies text to the clipboard; `copied` is true for two seconds after a successful copy. */
export function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // No clipboard access (e.g. not served over HTTPS): the text stays on screen to copy by hand.
      return false;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    return true;
  };
  return { copied, copy };
}
