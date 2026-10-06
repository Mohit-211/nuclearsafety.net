import { ShieldCheck } from 'lucide-react';

/** Decorative left-hand panel shared by the sign-in and password-reset screens. */
export function BrandPanel() {
  return <section className="login-panel" aria-hidden="true">
    <span className="login-brand">
      <span className="login-brand-mark"><ShieldCheck size={34} strokeWidth={1.6} /></span>
      <span className="login-brand-name">nuclearsafety<span className="login-brand-soft">.net</span><small>LEARNING MANAGEMENT</small></span>
    </span>
    <div className="login-panel-body">
      <h1>Nuclear safety training for your entire workforce.</h1>
      <p>Structured courses, clear progress tracking and certificates — all in one workspace.</p>
    </div>
    <p className="login-panel-foot">© 2026 nuclearsafety.net</p>
  </section>;
}
