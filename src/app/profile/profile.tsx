import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { CircleHelp, Check, Eye, EyeOff, Lock, Mail, SlidersHorizontal, UserRound } from 'lucide-react';
import { AppShell } from '@/components/training/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export const Route = createFileRoute('/profile')({
  head: () => ({
    meta: [
      { title: 'Profile | nuclearsafety.net' },
      { name: 'description', content: 'Your learner account details on nuclearsafety.net.' },
      { property: 'og:title', content: 'Profile | nuclearsafety.net' },
      { property: 'og:description', content: 'Your learner account details on nuclearsafety.net.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <AppShell title="Profile">
      <div className="page-heading">
        <div>
          <h1>Profile</h1>
          <p className="subtitle">Manage your account details and preferences.</p>
        </div>
      </div>
      <div className="account-col">
        <ProfileSection />
        <SecuritySection />
        <PreferencesSection />
        <div className="panel-divider flex items-center gap-3 text-[11px] text-muted-foreground">
          <CircleHelp size={15} className="shrink-0" />
          <span>Sample account data for demonstration. No account service is connected.</span>
        </div>
      </div>
    </AppShell>
  );
}

const initialProfile = {
  name: 'James Wilson',
  email: 'james.wilson@nuclearsafety.net',
  jobTitle: 'Reactor Operator',
  organisation: 'Nuclear Operations',
};

function ProfileSection() {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [values, setValues] = useState(initialProfile);

  const save = () => {
    setEditing(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <section className="account-card">
      <header className="account-card-head">
        <div>
          <h2 className="account-card-title"><UserRound size={16} className="text-primary" /> Profile information</h2>
          <p className="account-card-sub">Your name and work contact details.</p>
        </div>
        {editing ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setValues(initialProfile); setEditing(false); }}>Cancel</Button>
            <Button size="sm" onClick={save}>Save changes</Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>{saved ? <><Check size={14} /> Saved</> : 'Edit'}</Button>
        )}
      </header>
      <div className="account-grid">
        <div className="account-field">
          <Label htmlFor="pf-name">Full name</Label>
          <Input id="pf-name" value={values.name} disabled={!editing} onChange={e => setValues({ ...values, name: e.target.value })} />
        </div>
        <div className="account-field">
          <Label htmlFor="pf-email">Email</Label>
          <Input id="pf-email" type="email" value={values.email} disabled={!editing} onChange={e => setValues({ ...values, email: e.target.value })} />
        </div>
        <div className="account-field">
          <Label htmlFor="pf-title">Job title</Label>
          <Input id="pf-title" value={values.jobTitle} disabled={!editing} onChange={e => setValues({ ...values, jobTitle: e.target.value })} />
        </div>
        <div className="account-field">
          <Label htmlFor="pf-org">Organisation</Label>
          <Input id="pf-org" value={values.organisation} disabled={!editing} onChange={e => setValues({ ...values, organisation: e.target.value })} />
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <section className="account-card">
      <header className="account-card-head">
        <div>
          <h2 className="account-card-title"><Lock size={16} className="text-primary" /> Security</h2>
          <p className="account-card-sub">Change your password. Last updated 12 Aug 2026.</p>
        </div>
        <Button size="sm" onClick={update} disabled={saved}>{saved ? <><Check size={14} /> Updated</> : 'Update password'}</Button>
      </header>
      <div className="account-grid">
        <div className="account-field account-field-wide">
          <Label htmlFor="pw-current">Current password</Label>
          <Input id="pw-current" type={show ? 'text' : 'password'} placeholder="Enter current password" />
        </div>
        <div className="account-field">
          <Label htmlFor="pw-new">New password</Label>
          <Input id="pw-new" type={show ? 'text' : 'password'} placeholder="Minimum 10 characters" />
        </div>
        <div className="account-field pw-confirm">
          <Label htmlFor="pw-confirm">Confirm new password</Label>
          <div className="relative">
            <Input id="pw-confirm" type={show ? 'text' : 'password'} placeholder="Repeat new password" className="pr-10" />
            <button
              type="button"
              aria-label={show ? 'Hide passwords' : 'Show passwords'}
              className="pw-toggle"
              onClick={() => setShow(s => !s)}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function PreferencesSection() {
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [reminders, setReminders] = useState(true);

  return (
    <section className="account-card">
      <header className="account-card-head">
        <div>
          <h2 className="account-card-title"><SlidersHorizontal size={16} className="text-primary" /> Preferences</h2>
          <p className="account-card-sub">How you hear about your training.</p>
        </div>
      </header>
      <div className="account-pref-row">
        <div>
          <p className="text-sm font-medium">Email notifications</p>
          <p className="text-xs text-muted-foreground mt-0.5">Course assignments, completions and certificate alerts.</p>
        </div>
        <Switch checked={emailUpdates} onCheckedChange={setEmailUpdates} aria-label="Toggle email notifications" />
      </div>
      <div className="account-pref-row">
        <div>
          <p className="text-sm font-medium">Training reminders</p>
          <p className="text-xs text-muted-foreground mt-0.5">A weekly summary of courses due for completion.</p>
        </div>
        <Switch checked={reminders} onCheckedChange={setReminders} aria-label="Toggle training reminders" />
      </div>
      <div className="account-pref-row !border-b-0 !pb-0">
        <div>
          <p className="text-sm font-medium"><Mail size={14} className="inline text-muted-foreground" /> Language</p>
          <p className="text-xs text-muted-foreground mt-0.5">English (United Kingdom) — more languages coming at launch.</p>
        </div>
      </div>
    </section>
  );
}
