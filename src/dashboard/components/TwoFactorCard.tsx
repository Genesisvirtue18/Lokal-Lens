import React, { useState } from 'react';
import { Check, Copy, KeyRound, ShieldCheck } from 'lucide-react';
import { Badge, Button } from '@/components/ds';
import { useConfirm } from '@/components/ConfirmProvider';
import { TwoFactorSetup } from '@/components/TwoFactor';
import { request } from '../api';

// Account settings → two-step verification with an authenticator app. Admins can't turn it off.
export function TwoFactorCard({ enabled, isAdmin, onChange, showToast }: { enabled: boolean; isAdmin: boolean; onChange: (enabled: boolean) => void; showToast: (message: string) => void }) {
  const confirm = useConfirm();
  const [setting, setSetting] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const start = React.useCallback(() => request('/auth/2fa/setup', { method: 'POST', body: '{}' }), []);
  const confirmSetup = React.useCallback((code: string) => request('/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ code }) }), []);

  const withCode = async (title: string, message: string, label: string, path: string, after: (data: { recoveryCodes?: string[] }) => void) => {
    const code = await confirm({ title, message, confirmLabel: label, tone: 'warning', askCode: true });
    if (!code) return;
    setBusy(true);
    try { after(await request(path, { method: 'POST', body: JSON.stringify({ code: String(code) }) })); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : 'That didn’t work'); }
    finally { setBusy(false); }
  };

  return (
    <section className="flex flex-col gap-4 rounded-[20px] border border-[#dcdbd5] bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[#e6ebf7] text-[#002fa7]"><ShieldCheck size={22} aria-hidden="true" /></span>
          <div><h2 className="text-[18px] font-semibold leading-[26px] tracking-[-0.0111em]">Two-step verification</h2><p className="text-[14px] leading-5 text-[#4a4c55]">Sign in with a code from an authenticator app (Google Authenticator, Microsoft Authenticator, Authy). Even if someone learns your password, they can’t get in.</p></div>
        </div>
        {enabled ? <Badge tone="live">On</Badge> : <Badge tone="pending">Off</Badge>}
      </div>

      {codes ? (
        <div className="flex flex-col gap-3">
          <p className="text-[14px] leading-5 text-[#4a4c55]">Your new backup codes. The old ones no longer work. Each code works once.</p>
          <ul className="grid grid-cols-2 gap-2 rounded-[12px] bg-[#f7f7f4] p-4 font-mono text-[16px] sm:grid-cols-4">{codes.map((item) => <li key={item}>{item}</li>)}</ul>
          <div className="flex gap-2"><Button type="secondary" size="s" icon={copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} onClick={async () => { try { await navigator.clipboard.writeText(codes.join('\n')); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* shown on screen */ } }}>{copied ? 'Copied' : 'Copy'}</Button><Button type="primary" size="s" onClick={() => setCodes(null)}>I saved them</Button></div>
        </div>
      ) : setting ? (
        <div className="flex flex-col gap-3 border-t border-[#ecebe7] pt-4">
          <TwoFactorSetup start={start} confirm={confirmSetup} doneLabel="Done" onDone={() => { setSetting(false); onChange(true); showToast('Two-step verification is on.'); }} />
          <div><button type="button" onClick={() => setSetting(false)} className="text-[14px] font-medium text-[#002fa7] hover:underline">Cancel</button></div>
        </div>
      ) : enabled ? (
        <div className="flex flex-wrap gap-2">
          <Button type="secondary" size="s" disabled={busy} icon={<KeyRound size={16} aria-hidden="true" />} onClick={() => void withCode('Create new backup codes?', 'Your old backup codes stop working.', 'Create new codes', '/auth/2fa/recovery-codes', (data) => setCodes(data.recoveryCodes || []))}>New backup codes</Button>
          {!isAdmin && <Button type="ghost" size="s" disabled={busy} onClick={() => void withCode('Turn off two-step verification?', 'Your account will be protected by your password alone.', 'Turn off', '/auth/2fa/disable', () => { onChange(false); showToast('Two-step verification is off.'); })}>Turn off</Button>}
          {isAdmin && <p className="self-center text-[13px] text-[#6e7079]">Admin accounts must keep this on.</p>}
        </div>
      ) : (
        <div><Button type="primary" size="s" onClick={() => setSetting(true)}>Turn on</Button></div>
      )}
    </section>
  );
}
