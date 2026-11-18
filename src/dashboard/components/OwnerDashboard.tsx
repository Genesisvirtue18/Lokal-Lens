import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { BadgeCheck, Check, ChevronRight, ExternalLink, Eye, MessageSquare, Pencil, Plus, Star, Store, Trash2 } from 'lucide-react';
import { Badge, Button, cx } from '@/components/ds';
import { request } from '../api';
import { completenessPercent, completenessSections, CompletenessInput } from '../completeness';
import { BusinessListing, Lead, Review } from '../types';

interface OwnerDashboardProps {
  businesses: BusinessListing[];
  leads: Lead[];
  reviews: Review[];
  onOpenPublicProfile: (business: BusinessListing) => void;
  onOpenCompleteProfile: (business: BusinessListing) => void;
  onEditAtStep?: (business: BusinessListing, step: number) => void;
  onToggleVisibility?: (business: BusinessListing) => void;
  onDeleteBusiness?: (business: BusinessListing) => Promise<void> | void;
  onAddBusiness: () => void;
  onSelectLead: (lead: Lead) => void;
  onOpenReplyReview: (review: Review) => void;
  onViewAllLeads: () => void;
}

const businessImage = (business: BusinessListing) => business.images?.[0] || business.logo || '';

export const inputFromListing = (business: BusinessListing): CompletenessInput => ({
  name: business.name, category: business.category, description: business.description, phone: business.phone, email: business.email,
  addressLine1: business.address?.addressLine1, city: business.address?.city, state: business.address?.state, postalCode: business.address?.postalCode,
  services: business.services?.length || 0, openDays: (business.workingHours || []).filter((entry) => !entry.isClosed).length,
  photos: (business.images?.length || 0) + (business.logo && !business.images?.includes(business.logo) ? 1 : 0),
  website: business.website, verified: Boolean(business.verified) || (business.kycDocuments?.length || 0) > 0 || Boolean(business.gstNumber),
});

function Stat({ icon: Icon, label, value, note, tone }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: React.ReactNode; note?: string; tone?: 'alert' }) {
  return (
    <div className="flex flex-col gap-2 rounded-[16px] border border-[#dcdbd5] bg-white p-4 sm:gap-3 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-[14px] font-medium leading-5 text-[#4a4c55]">{label}</p>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#e6ebf7] text-[#002fa7]"><Icon size={18} /></span>
      </div>
      <p className="text-[28px] font-semibold leading-9 tracking-[-0.02em] tabular-nums sm:text-[32px]">{value}</p>
      {note ? <p className={cx('text-[13px] leading-[18px]', tone === 'alert' ? 'font-medium text-[#002fa7]' : 'text-[#6e7079]')}>{note}</p> : null}
    </div>
  );
}

function Step({ done, label, children }: { done: boolean; label: string; children?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className={cx('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[13px] font-semibold', done ? 'border-[#2b7a26] bg-[#2b7a26] text-white' : 'border-[#bdbcb5] text-[#6e7079]')}>{done ? <Check size={14} aria-hidden="true" /> : null}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-2"><p className={cx('text-[16px] leading-6', done && 'text-[#4a4c55]')}>{label}</p>{children}</div>
    </div>
  );
}

// Confirms the owner controls the email address with a one-time code.
function EmailVerification() {
  const [verified, setVerified] = useState<boolean | null>(null);
  const [step, setStep] = useState<'idle' | 'code'>('idle');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    request('/auth/me').then((data) => { setVerified(Boolean(data.user?.emailVerified)); setEmail(data.user?.email || ''); }).catch(() => setVerified(false));
  }, []);

  async function send() {
    setBusy(true); setError(''); setMessage('');
    try {
      const data = await request('/auth/otp/request', { method: 'POST', body: JSON.stringify({ email }) });
      setStep('code'); setCode(data.devCode || '');
      setMessage(data.devCode ? `Test mode: email isn’t set up yet, so your code is ${data.devCode}.` : `We sent a 6-digit code to ${email}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to send the code.'); }
    finally { setBusy(false); }
  }
  async function verify() {
    setBusy(true); setError('');
    try {
      const data = await request('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ email, code }) });
      if (data.accessToken) localStorage.setItem('directflow_access_token', data.accessToken);
      if (data.refreshToken) localStorage.setItem('directflow_refresh_token', data.refreshToken);
      setVerified(true); setStep('idle'); setMessage('Email confirmed.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'That code is not right.'); }
    finally { setBusy(false); }
  }

  return (
    <Step done={Boolean(verified)} label="Confirm your email with a one-time code">
      {!verified && step === 'idle' && <div><Button type="secondary" size="s" onClick={send} disabled={busy || verified === null}>{busy ? 'Sending…' : `Send code to ${email || 'my email'}`}</Button></div>}
      {step === 'code' && (
        <div className="flex max-w-[320px] flex-col gap-2">
          <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" aria-label="6-digit code" className="h-12 w-full rounded-[10px] border border-[#bdbcb5] px-3.5 text-center font-mono text-[20px] tracking-[0.3em] outline-none focus:border-2 focus:border-[#002fa7]" />
          <Button type="primary" size="s" onClick={verify} disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Verify'}</Button>
        </div>
      )}
      {message && <p role="status" className="text-[14px] leading-5 text-[#2b7a26]">{message}</p>}
      {error && <p role="alert" className="text-[14px] leading-5 text-[#b42318]">{error}</p>}
    </Step>
  );
}

const leadTone: Record<Lead['status'], string> = { New: 'bg-[#e6ebf7] text-[#002fa7]', Contacted: 'bg-[#fbf0d9] text-[#8a5a00]', Converted: 'bg-[#e7f4e5] text-[#2b7a26]' };

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ businesses, leads, reviews, onOpenPublicProfile, onOpenCompleteProfile, onEditAtStep, onToggleVisibility, onDeleteBusiness, onAddBusiness, onSelectLead, onViewAllLeads }) => {
  const [toDelete, setToDelete] = useState<BusinessListing | null>(null);
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const featured = businesses.find((business) => business.id === selectedId) || businesses[0];
  const sections = featured ? completenessSections(inputFromListing(featured)) : [];
  const percent = completenessPercent(sections);
  const doneCount = sections.filter((section) => section.done).length;
  const todo = sections.filter((section) => !section.done && section.id !== 'verified');
  const liveCount = businesses.filter((business) => business.status === 'Active').length;
  const pendingCount = businesses.filter((business) => business.status === 'Pending').length;
  const newLeads = leads.filter((lead) => lead.status === 'New').length;
  const totalViews = businesses.reduce((sum, business) => sum + (business.views || 0), 0);
  const ratings = reviews.map((review) => review.rating).filter(Boolean);
  const average = ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : 0;

  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-4 pb-24 pt-8 md:px-8 lg:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-eyebrow text-[#002fa7]">Owner dashboard</p>
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.0294em] md:text-[34px] md:leading-[42px]">Overview</h1>
        </div>
        <Button type="secondary" onClick={onAddBusiness} icon={<Plus size={18} aria-hidden="true" />}>Add another business</Button>
      </div>

      {businesses.length > 0 && (
        <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <Stat icon={Eye} label="Profile views" value={totalViews.toLocaleString('en-IN')} note="Across all listings" />
          <Stat icon={MessageSquare} label="Inquiries" value={leads.length} note={newLeads ? `${newLeads} new to reply to` : 'No new inquiries'} tone={newLeads ? 'alert' : undefined} />
          <Stat icon={Star} label="Average rating" value={average ? average.toFixed(1) : '–'} note={ratings.length ? `From ${ratings.length} review${ratings.length === 1 ? '' : 's'}` : 'No reviews yet'} />
          <Stat icon={Store} label={businesses.length === 1 ? 'Listing' : 'Listings'} value={businesses.length} note={[liveCount && `${liveCount} live`, pendingCount && `${pendingCount} in review`].filter(Boolean).join(' · ') || 'None live yet'} />
        </section>
      )}

      <section className="flex flex-col gap-5" aria-label="Your business listings">
        {businesses.length ? (
          <ul className="flex flex-col overflow-hidden rounded-[20px] border border-[#dcdbd5] bg-white">
            {businesses.map((business) => {
              const image = businessImage(business);
              const pending = business.status === 'Pending';
              const live = business.status === 'Active';
              const paused = business.status === 'Paused';
              const strength = completenessPercent(completenessSections(inputFromListing(business)));
              return (
                <li key={business.id} className="flex flex-col gap-4 border-b border-[#ecebe7] p-4 last:border-0 md:flex-row md:items-center md:px-5">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[12px] bg-[#f1f1ee]">
                      {image ? <Image src={image} alt="" unoptimized fill sizes="64px" className="object-cover" /> : <div className="grid h-full place-items-center text-[#6e7079]"><Store size={24} aria-hidden="true" /></div>}
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-[18px] font-semibold leading-6 tracking-[-0.01em]">{business.name}</h2>
                        {live ? <Badge tone="live">Live</Badge> : paused ? <Badge tone="pending">Paused</Badge> : pending ? <Badge tone="pending">In review</Badge> : business.status === 'Rejected' ? <Badge tone="closed">Needs changes</Badge> : <Badge tone="closed">{business.status}</Badge>}
                        {business.verified && <Badge tone="verified">Verified</Badge>}
                      </div>
                      <p className="truncate text-[14px] leading-5 text-[#6e7079]">{[business.category, business.location].filter(Boolean).join(' · ')}</p>
                      {business.status === 'Rejected' && <p role="status" className="rounded-[10px] bg-[#fdecea] px-3 py-2 text-[13px] leading-[18px] text-[#8c1d13]"><span className="font-semibold">Our team asked for changes{business.rejectionReason ? ':' : '.'}</span>{business.rejectionReason ? ` ${business.rejectionReason}` : ''} Fix it and save. It goes back to review automatically.</p>}
                      {business.status === 'Rejected' ? null : <p className="text-[13px] leading-[18px] text-[#4a4c55]">{pending ? 'Not visible to customers until our team approves it.' : live ? 'Visible to customers.' : paused ? 'Hidden from search until you resume.' : 'Not visible to customers right now.'}</p>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1 md:w-[150px]">
                    <span className="text-[13px] font-medium leading-[18px]">Profile {strength}% complete</span>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#e4e3de]"><div className={cx('h-full rounded-full', strength === 100 ? 'bg-[#2b7a26]' : 'bg-[#002fa7]')} style={{ width: `${strength}%` }} /></div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button type="primary" size="s" onClick={() => onOpenCompleteProfile(business)} icon={<Pencil size={18} aria-hidden="true" />}>Edit</Button>
                    <Button type="secondary" size="s" onClick={() => onOpenPublicProfile(business)} icon={<ExternalLink size={18} aria-hidden="true" />}>{live ? 'View as customer' : 'Preview'}</Button>
                    {(live || paused) && onToggleVisibility && <Button type="ghost" size="s" onClick={() => onToggleVisibility(business)}>{live ? 'Pause' : 'Resume'}</Button>}
                    {onDeleteBusiness && <button type="button" onClick={() => { setTyped(''); setToDelete(business); }} aria-label={`Delete ${business.name}`} className="grid h-10 w-10 place-items-center rounded-[10px] text-[#6e7079] hover:bg-[#fdecea] hover:text-[#b42318]"><Trash2 size={18} aria-hidden="true" /></button>}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-[20px] border border-dashed border-[#bdbcb5] bg-white p-10 text-center"><p className="text-[16px] text-[#4a4c55]">No business listings yet. Add a business to get started.</p><Button type="primary" onClick={onAddBusiness}>Add your business</Button></div>
        )}
      </section>

      {featured && (
        <section className="flex flex-col gap-4" aria-label="Profile setup">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-[20px] font-semibold leading-7 tracking-[-0.01em]">Profile setup</h2><p className="text-[14px] leading-5 text-[#4a4c55]">{businesses.length > 1 ? 'Choose a business to see what is left to finish.' : 'What is left to finish on your listing.'}</p></div>
            {businesses.length > 1 && (
              <div role="tablist" aria-label="Business" className="flex max-w-full flex-wrap gap-2">
                {businesses.map((business) => <button key={business.id} type="button" role="tab" aria-selected={business.id === featured.id} onClick={() => setSelectedId(business.id)} className={cx('h-10 max-w-[240px] truncate rounded-full border px-4 text-[14px] font-medium transition-colors', business.id === featured.id ? 'border-[#002fa7] bg-[#002fa7] text-white' : 'border-[#bdbcb5] bg-white text-[#101115] hover:border-[#101115]')}>{business.name}{business.category ? ` · ${business.category}` : ''}</button>)}
              </div>
            )}
          </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="flex flex-col gap-4 rounded-[20px] border border-[#dcdbd5] bg-white p-6">
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-[18px] font-semibold leading-[26px] tracking-[-0.0111em]">Complete your profile</h2><p className="text-[14px] leading-5 text-[#4a4c55]">{featured.name} · {doneCount} of {sections.length} steps done</p></div><span className="text-[28px] font-semibold leading-8">{percent}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-[#e4e3de]"><div className="h-full rounded-full bg-[#002fa7] transition-[width]" style={{ width: `${percent}%` }} /></div>
            <ul className="flex flex-col">
              {sections.map((section) => (
                <li key={section.id} className="border-b border-[#ecebe7] last:border-0">
                  {section.done || section.id === 'verified'
                    ? <div className="flex min-h-11 items-center gap-3 py-1.5 text-[15px]"><span className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-full', section.done ? 'bg-[#2b7a26] text-white' : 'border border-[#bdbcb5]')}>{section.done && <Check size={12} aria-hidden="true" />}</span><span className={section.done ? 'text-[#4a4c55]' : ''}>{section.label}</span></div>
                    : <button type="button" onClick={() => onOpenCompleteProfile(featured)} className="flex min-h-11 w-full items-center gap-3 py-1.5 text-left text-[15px] hover:text-[#002fa7]"><span className="h-5 w-5 shrink-0 rounded-full border border-[#bdbcb5]" /><span className="flex-1"><span className="block font-medium">{section.label}</span><span className="block text-[13px] leading-[18px] text-[#6e7079]">{section.hint}</span></span><ChevronRight size={18} className="shrink-0 text-[#6e7079]" aria-hidden="true" /></button>}
                </li>
              ))}
            </ul>
            {todo.length > 0 && <p className="text-[14px] leading-5 text-[#4a4c55]">Tap an item to fix it. Complete profiles get more calls and rank better in search.</p>}
          </article>

          <article className="flex flex-col gap-4 rounded-[20px] border border-[#dcdbd5] bg-white p-6">
            <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[#e7f4e5] text-[#2b7a26]"><BadgeCheck size={22} aria-hidden="true" /></span><div><h2 className="text-[18px] font-semibold leading-[26px] tracking-[-0.0111em]">{featured.verified ? 'Your business is verified' : 'Get your Verified badge'}</h2><p className="text-[14px] leading-5 text-[#4a4c55]">{featured.verified ? 'Customers see a green Verified badge on your card and profile.' : 'Verified businesses are trusted more and shown above unverified ones in search.'}</p></div></div>
            {!featured.verified && (
              <ul className="grid gap-1.5 rounded-[12px] bg-[#f7f7f4] p-4 text-[14px] leading-5">
                <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-[#2b7a26]" aria-hidden="true" />Green Verified badge on every card and your profile</li>
                <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-[#2b7a26]" aria-hidden="true" />Ranks higher when customers search</li>
                <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-[#2b7a26]" aria-hidden="true" />Customers feel safer calling you</li>
              </ul>
            )}
            <div className="flex flex-col gap-4">
              <EmailVerification />
              <Step done={Boolean(featured.verified) || (featured.kycDocuments?.length || 0) > 0 || Boolean(featured.gstNumber)} label="Add your GST number or upload address proof">
                {!featured.verified && !(featured.kycDocuments?.length) && !featured.gstNumber && <div><Button type="secondary" size="s" onClick={() => (onEditAtStep ? onEditAtStep(featured, 3) : onOpenCompleteProfile(featured))}>Add proof</Button></div>}
                {!featured.verified && ((featured.kycDocuments?.length || 0) > 0 || Boolean(featured.gstNumber)) && <p className="text-[14px] leading-5 text-[#8a5a00]">Submitted — our team is checking it.</p>}
              </Step>
            </div>
          </article>
        </div>
        </section>
      )}

      {featured && (
        <section className="flex flex-col gap-4 rounded-[20px] border border-[#dcdbd5] bg-white p-6" aria-label="Recent inquiries">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-[18px] font-semibold leading-[26px] tracking-[-0.0111em]">Recent inquiries</h2><p className="text-[14px] leading-5 text-[#4a4c55]">Customers who contacted you through your profile.</p></div>
            {leads.length > 0 && <Button type="ghost" size="s" onClick={onViewAllLeads} trailingIcon={<ChevronRight size={18} aria-hidden="true" />}>View all inquiries</Button>}
          </div>
          {leads.length ? (
            <ul className="flex flex-col divide-y divide-[#ecebe7]">
              {leads.slice(0, 5).map((lead) => (
                <li key={lead.id}>
                  <button type="button" onClick={() => onSelectLead(lead)} className="flex w-full items-start gap-4 py-3.5 text-left hover:bg-[#f7f7f4]">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fbe6ec] font-display text-[15px] font-semibold text-[#7a2842]">{(lead.name || '?')[0].toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5"><span className="font-display text-[15px] font-semibold">{lead.name}</span><span className="text-[13px] text-[#6e7079]">{lead.timestamp} · {lead.targetBusiness}</span></span>
                      <span className="mt-0.5 line-clamp-1 block text-[14px] leading-5 text-[#4a4c55]">{lead.service ? `${lead.service} — ` : ''}{lead.message}</span>
                    </span>
                    <span className={cx('shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold', leadTone[lead.status])}>{lead.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="rounded-[12px] bg-[#f7f7f4] px-4 py-6 text-center text-[14px] text-[#4a4c55]">No inquiries yet. Once your listing is live, customer messages and calls will appear here.</p>}
        </section>
      )}
      {toDelete && (
        <div role="dialog" aria-modal="true" aria-labelledby="delete-title" className="fixed inset-0 z-50 grid place-items-center bg-[#101115]/50 p-4" onClick={() => !deleting && setToDelete(null)}>
          <div className="flex w-full max-w-[440px] flex-col gap-4 rounded-[20px] bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div><h2 id="delete-title" className="text-[20px] font-semibold leading-7">Delete “{toDelete.name}”?</h2><p className="mt-1 text-[14px] leading-5 text-[#4a4c55]">It disappears from search and its public page stops working. Customer inquiries and reviews are kept by our team. This can’t be undone from here.</p></div>
            <label className="flex flex-col gap-1.5"><span className="font-display text-[14px] font-medium">Type the business name to confirm</span><input autoFocus value={typed} onChange={(event) => setTyped(event.target.value)} placeholder={toDelete.name} className="h-12 w-full rounded-[10px] border border-[#bdbcb5] px-3.5 text-[16px] outline-none focus:border-2 focus:border-[#b42318]" /></label>
            <div className="flex justify-end gap-3">
              <Button type="secondary" size="s" onClick={() => setToDelete(null)} disabled={deleting}>Cancel</Button>
              <button type="button" disabled={deleting || typed.trim().toLowerCase() !== toDelete.name.trim().toLowerCase()} onClick={async () => { setDeleting(true); try { await onDeleteBusiness?.(toDelete); } finally { setDeleting(false); setToDelete(null); } }} className="h-10 rounded-[10px] bg-[#b42318] px-4 font-display text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#e4e3de] disabled:text-[#9a9ba3]">{deleting ? 'Deleting…' : 'Delete listing'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
