import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Check, Building2, GraduationCap, Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { AdminShell } from '@/components/training/admin-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export const Route = createFileRoute('/admin/settings')({
  head: () => ({ meta: [
    { title: 'Settings | nuclearsafety.net' },
    { name: 'description', content: 'Platform settings for your organisation.' },
    { property: 'og:title', content: 'Settings | nuclearsafety.net' },
    { property: 'og:description', content: 'Platform settings for your organisation.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: AdminSettings,
});

function AdminSettings() {
  return (
    <AdminShell title="Settings">
      <div className="page-heading">
        <div>
          <h1>Settings</h1>
          <p className="subtitle">Configuration for your organisation's training platform.</p>
        </div>
      </div>
      <div className="account-col">
        <GeneralSection />
        <TrainingSection />
        <SecuritySection />
        <div className="panel-divider flex items-center gap-3 text-[11px] text-muted-foreground">
          <ShieldCheck size={15} className="shrink-0 text-primary" />
          <span>Sample settings for demonstration. Nothing is stored or connected in this preview.</span>
        </div>
      </div>
    </AdminShell>
  );
}

function useSaved(delay = 2000) {
  const [saved, setSaved] = useState(false);
  const save = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), delay);
  };
  return { saved, save };
}

function GeneralSection() {
  const [values, setValues] = useState({
    organisation: 'Nuclear Operations — Training',
    supportEmail: 'training@nuclearsafety.net',
    language: 'en-GB',
    timezone: 'Europe/London',
  });
  const { saved, save } = useSaved();

  return (
    <section className="account-card">
      <header className="account-card-head">
        <div>
          <h2 className="account-card-title"><Building2 size={16} className="text-primary" /> General settings</h2>
          <p className="account-card-sub">Organisation details and regional defaults.</p>
        </div>
        <Button size="sm" onClick={save} disabled={saved}>{saved ? <><Check size={14} /> Saved</> : 'Save changes'}</Button>
      </header>
      <div className="account-grid">
        <div className="account-field">
          <Label htmlFor="st-org">Organisation name</Label>
          <Input id="st-org" value={values.organisation} onChange={e => setValues({ ...values, organisation: e.target.value })} />
        </div>
        <div className="account-field">
          <Label htmlFor="st-email">Training support email</Label>
          <Input id="st-email" type="email" value={values.supportEmail} onChange={e => setValues({ ...values, supportEmail: e.target.value })} />
        </div>
        <div className="account-field">
          <Label htmlFor="st-lang">Default language</Label>
          <select
            id="st-lang"
            className="course-select w-full"
            value={values.language}
            onChange={e => setValues({ ...values, language: e.target.value })}
          >
            <option value="en-GB">English (United Kingdom)</option>
            <option value="en-US">English (United States)</option>
            <option value="sv-SE">Swedish</option>
          </select>
        </div>
        <div className="account-field">
          <Label htmlFor="st-tz">Time zone</Label>
          <select
            id="st-tz"
            className="course-select w-full"
            value={values.timezone}
            onChange={e => setValues({ ...values, timezone: e.target.value })}
          >
            <option value="Europe/London">Europe — London (GMT/BST)</option>
            <option value="Europe/Stockholm">Europe — Stockholm (CET)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
      </div>
    </section>
  );
}

function TrainingSection() {
  const [dueWindow, setDueWindow] = useState('30');
  const [passMark, setPassMark] = useState('80');
  const [expiryReminders, setExpiryReminders] = useState(true);
  const [autoAssign, setAutoAssign] = useState(false);
  const { saved, save } = useSaved();

  return (
    <section className="account-card">
      <header className="account-card-head">
        <div>
          <h2 className="account-card-title"><GraduationCap size={16} className="text-primary" /> Training settings</h2>
          <p className="account-card-sub">How courses are assigned and completed.</p>
        </div>
        <Button size="sm" onClick={save} disabled={saved}>{saved ? <><Check size={14} /> Saved</> : 'Save changes'}</Button>
      </header>
      <div className="account-grid">
        <div className="account-field">
          <Label htmlFor="st-due">Default due window after assignment</Label>
          <select id="st-due" className="course-select w-full" value={dueWindow} onChange={e => setDueWindow(e.target.value)}>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
          </select>
        </div>
        <div className="account-field">
          <Label htmlFor="st-pass">Pass mark for assessed courses</Label>
          <select id="st-pass" className="course-select w-full" value={passMark} onChange={e => setPassMark(e.target.value)}>
            <option value="70">70%</option>
            <option value="80">80%</option>
            <option value="90">90%</option>
          </select>
        </div>
      </div>
      <div className="account-pref-row">
        <div>
          <p className="text-sm font-medium">Certificate expiry reminders</p>
          <p className="text-xs text-muted-foreground mt-0.5">Notify learners when a certificate is approaching its expiry date.</p>
        </div>
        <Switch checked={expiryReminders} onCheckedChange={setExpiryReminders} aria-label="Toggle certificate expiry reminders" />
      </div>
      <div className="account-pref-row !border-b-0 !pb-0">
        <div>
          <p className="text-sm font-medium">Automatic course assignment</p>
          <p className="text-xs text-muted-foreground mt-0.5">Assign mandatory courses automatically to new learner accounts.</p>
        </div>
        <Switch checked={autoAssign} onCheckedChange={setAutoAssign} aria-label="Toggle automatic course assignment" />
      </div>
    </section>
  );
}

function SecuritySection() {
  const [show, setShow] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);
  const { saved, save } = useSaved();

  return (
    <section className="account-card">
      <header className="account-card-head">
        <div>
          <h2 className="account-card-title"><Lock size={16} className="text-primary" /> Account & security</h2>
          <p className="account-card-sub">Your administrator account. Last password update 12 Aug 2026.</p>
        </div>
        <Button size="sm" onClick={save} disabled={saved}>{saved ? <><Check size={14} /> Updated</> : 'Update password'}</Button>
      </header>
      <div className="account-grid">
        <div className="account-field">
          <Label htmlFor="st-pw-new">New password</Label>
          <div className="relative">
            <Input id="st-pw-new" type={show ? 'text' : 'password'} placeholder="Minimum 10 characters" className="pr-10" />
            <button
              type="button"
              aria-label={show ? 'Hide password' : 'Show password'}
              className="pw-toggle"
              onClick={() => setShow(s => !s)}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="account-field">
          <Label htmlFor="st-pw-confirm">Confirm new password</Label>
          <Input id="st-pw-confirm" type={show ? 'text' : 'password'} placeholder="Repeat new password" />
        </div>
      </div>
      <div className="account-pref-row !border-b-0 !pb-0">
        <div>
          <p className="text-sm font-medium">Two-factor authentication</p>
          <p className="text-xs text-muted-foreground mt-0.5">Require a verification code when signing in to admin accounts.</p>
        </div>
        <Switch checked={twoFactor} onCheckedChange={setTwoFactor} aria-label="Toggle two-factor authentication" />
      </div>
    </section>
  );
}
