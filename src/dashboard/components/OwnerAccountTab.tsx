import React, { useEffect, useState } from 'react';
import { TwoFactorCard } from './TwoFactorCard';
import { BadgeCheck, Eye, EyeOff, Laptop, LogOut, Trash2 } from 'lucide-react';
import { Badge, Button, Field, cx, fieldClass } from '@/components/ds';
import { saveSession, request } from '../api';
import { passwordProblem } from '@/lib/password';

export type OwnerUser = { name: string; email: string; phone?: string; emailVerified?: boolean; hasPassword?: boolean; hasTotp?: boolean; role?: string; notificationPreferences?: { email?: boolean } };
type Session = { current?: boolean; _id: string; userAgent?: string; ip?: string; createdAt?: string };

interface Props { user: OwnerUser | null; onUserChange: (user: OwnerUser) => void; onLogout: () => void; showToast: (message: string) => void }

const when = (value?: string) => { try { return new Date(value || '').toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); } catch { return ''; } };
const device = (agent = '') => { if (!agent.trim() || !/Mozilla|Chrome|Safari|Firefox/i.test(agent)) return 'Unknown device'; const browser = /Edg/i.test(agent) ? 'Edge' : /OPR|Opera/i.test(agent) ? 'Opera' : /Chrome|CriOS/i.test(agent) ? 'Chrome' : /Firefox|FxiOS/i.test(agent) ? 'Firefox' : /Safari/i.test(agent) ? 'Safari' : 'Browser'; const os = /Android/i.test(agent) ? 'Android' : /iPhone|iPad/i.test(agent) ? 'iPhone / iPad' : /Windows/i.test(agent) ? 'Windows' : /Mac OS X|Macintosh/i.test(agent) ? 'Mac' : /Linux/i.test(agent) ? 'Linux' : ''; return os ? `${browser} on ${os}` : browser; };

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-[20px] border border-[#dcdbd5] bg-white p-6">
      <div><h2 className="text-[18px] font-semibold leading-[26px] tracking-[-0.0111em]">{title}</h2>{hint && <p className="text-[14px] leading-5 text-[#4a4c55]">{hint}</p>}</div>
      {children}
    </section>
  );
}

export const OwnerAccountTab: React.FC<Props> = ({ user, onUserChange, onLogout, showToast }) => {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [resetNote, setResetNote] = useState('');

  const [sessions, setSessions] = useState<Session[]>([]);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // The profile loads after the page opens, so the fields are filled in when it arrives.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setName(user?.name || ''); setPhone(user?.phone || ''); }, [user]);
  useEffect(() => { request('/auth/sessions').then((data) => setSessions(data.items || [])).catch(() => setSessions([])); }, []);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    const cleanName = name.trim().replace(/\s{2,}/g, ' ');
    if (cleanName.length < 2) { setProfileError('Enter your full name.'); return; }
    if (!/^[\p{L}][\p{L}\s.'’-]*$/u.test(cleanName)) { setProfileError('Use letters only in your name.'); return; }
    if (phone && !/^[6-9]\d{9}$/.test(phone)) { setProfileError('Enter a 10-digit mobile number starting with 6, 7, 8 or 9.'); return; }
    setSavingProfile(true); setProfileError('');
    try {
      const data = await request('/users/me', { method: 'PATCH', body: JSON.stringify({ name: cleanName, ...(phone ? { phone } : {}) }) });
      onUserChange({ ...(user as OwnerUser), ...(data.user || {}), name: cleanName, phone });
      showToast('Profile saved.');
    } catch (reason) { setProfileError(reason instanceof Error ? reason.message : 'Unable to save your profile.'); }
    finally { setSavingProfile(false); }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    setPasswordError('');
    if (user?.hasPassword && !current) { setPasswordError('Enter your current password.'); return; }
    const problem = passwordProblem(next); if (problem) { setPasswordError(`New password: ${problem}`); return; }
    if (next !== again) { setPasswordError('The two new passwords don’t match.'); return; }
    setSavingPassword(true);
    try {
      const data = await request('/auth/change-password', { method: 'POST', body: JSON.stringify({ ...(user?.hasPassword ? { currentPassword: current } : {}), newPassword: next }) });
      saveSession(data.accessToken);
      setCurrent(''); setNext(''); setAgain('');
      onUserChange({ ...(user as OwnerUser), hasPassword: true });
      showToast(user?.hasPassword ? 'Password updated. Other devices were signed out.' : 'Password set. You can now sign in with it.');
    } catch (reason) { setPasswordError(reason instanceof Error ? reason.message : 'Unable to change the password.'); }
    finally { setSavingPassword(false); }
  }

  async function sendResetLink() {
    setResetNote('');
    try { await request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: user?.email }) }); setResetNote(`We sent a reset link to ${user?.email}. It works for 1 hour.`); }
    catch (reason) { setResetNote(reason instanceof Error ? reason.message : 'Unable to send the link.'); }
  }

  async function toggleEmailAlerts(value: boolean) {
    try {
      await request('/users/me', { method: 'PATCH', body: JSON.stringify({ notificationPreferences: { email: value } }) });
      onUserChange({ ...(user as OwnerUser), notificationPreferences: { ...(user?.notificationPreferences || {}), email: value } });
      showToast(value ? 'Email alerts are on.' : 'Email alerts are off.');
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Unable to save that.'); }
  }

  async function signOutEverywhere() {
    try { await request('/auth/sessions', { method: 'DELETE' }); } catch { /* the local session is cleared anyway */ }
    onLogout();
  }

  async function deleteAccount() {
    if (confirmText !== 'DELETE') { setDeleteError('Type DELETE to confirm.'); return; }
    setDeleting(true); setDeleteError('');
    try { await request('/users/me', { method: 'DELETE' }); onLogout(); }
    catch (reason) { setDeleteError(reason instanceof Error ? reason.message : 'Unable to delete the account.'); setDeleting(false); }
  }

  const emailAlerts = user?.notificationPreferences?.email !== false;
  const passwordField = (id: string, label: string, value: string, set: (v: string) => void, autoComplete: string) => (
    <Field label={label} required>
      <span className="relative block"><input id={id} type={showPasswords ? 'text' : 'password'} value={value} onChange={(event) => set(event.target.value.slice(0, 128))} autoComplete={autoComplete} className={cx(fieldClass, 'pr-12')} />
        <button type="button" onClick={() => setShowPasswords((state) => !state)} aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a4c55] hover:text-[#101115]">{showPasswords ? <EyeOff size={20} /> : <Eye size={20} />}</button></span>
    </Field>
  );

  const isCustomer = user?.role === 'customer';
  return (
    <main className="mx-auto flex w-full max-w-[860px] flex-col gap-6 px-4 pb-24 pt-8 md:px-8 lg:pt-10">
      {!isCustomer && <div className="flex flex-col gap-2"><p className="font-eyebrow text-[#002fa7]">Account</p><h1 className="text-[28px] font-semibold leading-9 tracking-[-0.0294em] md:text-[34px] md:leading-[42px]">Account settings</h1><p className="text-[16px] leading-6 text-[#4a4c55]">Your own details and sign-in. Your business details are under Overview.</p></div>}

      <Card title="Your profile">
        <form onSubmit={saveProfile} className="flex flex-col gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required><input value={name} onChange={(event) => { setName(event.target.value.replace(/[^\p{L}\s.'’-]/gu, '').slice(0, 120)); setProfileError(''); }} autoComplete="name" className={fieldClass} /></Field>
            <Field label="Mobile number" optional helper="Only used by our team to reach you."><input value={phone} onChange={(event) => { setPhone(event.target.value.replace(/\D/g, '').slice(0, 10)); setProfileError(''); }} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit number" className={fieldClass} /></Field>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="font-display text-[14px] font-medium leading-5">Email address</span>
            <div className="flex flex-wrap items-center gap-3"><span className="flex h-12 min-w-0 flex-1 items-center rounded-[10px] border border-[#dcdbd5] bg-[#f7f7f4] px-3.5 text-[16px] text-[#4a4c55]">{user?.email}</span>{user?.emailVerified ? <Badge tone="verified">Email confirmed</Badge> : <Badge tone="pending">Not confirmed</Badge>}</div>
            <p className="text-[14px] leading-5 text-[#6e7079]">{user?.emailVerified ? 'You sign in with a code sent to this address.' : 'Confirm it from Overview → Get your Verified badge.'}</p>
          </div>
          {profileError && <p role="alert" className="text-[14px] leading-5 text-[#b42318]">{profileError}</p>}
          <div><Button type="primary" size="s" htmlType="submit" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save profile'}</Button></div>
        </form>
      </Card>

      <Card title={user?.hasPassword ? 'Change password' : 'Set a password'} hint={user?.hasPassword ? 'Changing it signs you out on other devices.' : 'You sign in with email codes right now. Set a password if you also want to sign in with one.'}>
        <form onSubmit={savePassword} className="flex max-w-[420px] flex-col gap-4" noValidate>
          {user?.hasPassword && passwordField('current-password', 'Current password', current, setCurrent, 'current-password')}
          {passwordField('new-password', 'New password', next, setNext, 'new-password')}
          {passwordField('confirm-password', 'Confirm new password', again, setAgain, 'new-password')}
          <p className="-mt-1 text-[13px] leading-[18px] text-[#6e7079]">At least 8 characters, with letters and numbers.</p>
          {passwordError && <p role="alert" className="text-[14px] leading-5 text-[#b42318]">{passwordError}</p>}
          <div className="flex flex-wrap items-center gap-3"><Button type="primary" size="s" htmlType="submit" disabled={savingPassword}>{savingPassword ? 'Saving…' : user?.hasPassword ? 'Update password' : 'Set password'}</Button>
            {user?.hasPassword && <button type="button" onClick={sendResetLink} className="font-display text-[14px] font-medium text-[#002fa7] hover:underline">Forgot your password? Email me a reset link</button>}</div>
          {resetNote && <p role="status" className="text-[14px] leading-5 text-[#2b7a26]">{resetNote}</p>}
        </form>
      </Card>

      <TwoFactorCard enabled={Boolean(user?.hasTotp)} isAdmin={user?.role === 'admin' || user?.role === 'super_admin'} onChange={(hasTotp) => onUserChange({ ...(user as OwnerUser), hasTotp })} showToast={showToast} />

      {!isCustomer && <Card title="Notifications">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={emailAlerts} onChange={(event) => toggleEmailAlerts(event.target.checked)} className="mt-1 h-[18px] w-[18px] shrink-0 accent-[#002fa7]" />
          <span><span className="block text-[16px] font-medium leading-6">Email me when a customer sends an inquiry</span><span className="block text-[14px] leading-5 text-[#6e7079]">Sent to {user?.email}.</span></span>
        </label>
      </Card>}

      <Card title="Where you’re signed in" hint="If you don’t recognise a device, sign out everywhere and change your password.">
        {sessions.length ? <ul className="flex flex-col divide-y divide-[#ecebe7]">{sessions.slice(0, 6).map((session) => <li key={session._id} className="flex items-center gap-3 py-3"><Laptop size={20} className="shrink-0 text-[#6e7079]" /><div className="min-w-0 flex-1"><p className="text-[15px] font-medium leading-5">{device(session.userAgent)}{session.current && <span className="ml-2 rounded-full bg-[#e7f4e5] px-2 py-0.5 align-middle font-display text-[12px] font-semibold text-[#2b7a26]">This device</span>}</p><p className="text-[13px] leading-[18px] text-[#6e7079]">{[session.ip && !/^(::1|127.)/.test(session.ip) ? session.ip : '', when(session.createdAt)].filter(Boolean).join(' · ')}</p></div>{!session.current && <button type="button" onClick={async () => { try { await request(`/auth/sessions/${session._id}`, { method: 'DELETE' }); setSessions((list) => list.filter((item) => item._id !== session._id)); } catch { /* leave it listed */ } }} className="h-9 shrink-0 rounded-[8px] px-3 text-[14px] font-medium text-[#b42318] hover:bg-[#fdecea]">Sign out</button>}</li>)}</ul> : <p className="text-[14px] text-[#6e7079]">No other sessions to show.</p>}
        <div className="flex flex-wrap gap-3"><Button type="secondary" size="s" onClick={signOutEverywhere} icon={<LogOut size={18} aria-hidden="true" />}>Sign out everywhere</Button></div>
      </Card>

      <section className="flex flex-col gap-4 rounded-[20px] border border-[#f1c9c4] bg-[#fff8f7] p-6">
        <div><h2 className="flex items-center gap-2 text-[18px] font-semibold leading-[26px] text-[#b42318]"><Trash2 size={20} aria-hidden="true" />Delete my account</h2><p className="text-[14px] leading-5 text-[#4a4c55]">You’ll be signed out and can’t sign in again. {isCustomer ? 'Your saved list and inquiries will no longer be reachable. This can’t be undone.' : 'Your listings stay with our team until you ask us to remove them. This can’t be undone.'}</p></div>
        <div className="flex max-w-[420px] flex-col gap-3"><Field label="Type DELETE to confirm"><input value={confirmText} onChange={(event) => { setConfirmText(event.target.value.slice(0, 10)); setDeleteError(''); }} className={fieldClass} placeholder="DELETE" /></Field>
          {deleteError && <p role="alert" className="text-[14px] text-[#b42318]">{deleteError}</p>}
          <div><button type="button" onClick={deleteAccount} disabled={deleting || confirmText !== 'DELETE'} className="inline-flex h-11 items-center rounded-[12px] bg-[#b42318] px-4 font-display text-[14px] font-medium text-white transition-colors hover:bg-[#8f1b12] disabled:cursor-not-allowed disabled:bg-[#e4e3de] disabled:text-[#9a9ba1]">{deleting ? 'Deleting…' : 'Delete my account'}</button></div>
        </div>
      </section>
      {!isCustomer && <p className="flex items-center gap-2 text-[13px] text-[#6e7079]"><BadgeCheck size={16} aria-hidden="true" />Your email and phone are never shown on your public listing unless you add them as contact details.</p>}
    </main>
  );
};
