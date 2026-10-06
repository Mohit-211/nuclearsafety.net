import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SaveButton({ state, onSave, label = 'Save changes' }: { state: 'idle' | 'loading' | 'success' | 'error'; onSave: () => void; label?: string }) {
  return <Button size="sm" onClick={onSave} disabled={state === 'loading'}>
    {state === 'loading' ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : state === 'success' ? <><Check size={14} /> Saved</> : label}
  </Button>;
}
