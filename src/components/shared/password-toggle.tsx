import { Eye, EyeOff } from 'lucide-react';

/** Eye button positioned inside a password input's `relative` wrapper. */
export function PasswordToggle({ shown, onToggle, plural = false }: { shown: boolean; onToggle: () => void; plural?: boolean }) {
  const noun = plural ? 'passwords' : 'password';
  return <button type="button" aria-label={shown ? `Hide ${noun}` : `Show ${noun}`} className="pw-toggle" onClick={onToggle}>
    {shown ? <EyeOff size={16} /> : <Eye size={16} />}
  </button>;
}
