import { useConfirm } from '@/components/ConfirmProvider';
import React, { useState } from 'react';
import { Plus, Tag, Trash2 } from 'lucide-react';
import { Badge, Button, Field, cx, fieldClass } from '@/components/ds';
import { checkOffer, clean } from '@/lib/business-validation';
import { updateOwnerBusiness } from '../api';
import { BusinessListing } from '../types';

interface Props { businesses: BusinessListing[]; onChanged: () => Promise<void> | void; showToast: (message: string) => void }
type Offer = NonNullable<BusinessListing['offers']>[number];

const today = () => new Date().toISOString().slice(0, 10);
const when = (value?: string) => { try { return new Date(value || '').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };
const state = (offer: Offer) => (offer.isActive === false ? 'paused' : offer.validUntil && new Date(offer.validUntil) < new Date() ? 'expired' : 'live');
const payload = (offers: Offer[]) => offers.map((offer) => ({ title: offer.title, ...(offer.description ? { description: offer.description } : {}), ...(offer.code ? { code: offer.code } : {}), ...(offer.occasion ? { occasion: offer.occasion } : {}), ...(offer.validUntil ? { validUntil: new Date(offer.validUntil).toISOString() } : {}), isActive: offer.isActive }));

// Offers across all listings. Live offers appear on the profile and on the public Offers page.
export const OwnerOffersTab: React.FC<Props> = ({ businesses, onChanged, showToast }) => {
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  const [target, setTarget] = useState(businesses[0]?.id || '');
  const [draft, setDraft] = useState({ title: '', occasion: '', validUntil: '', code: '', description: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const rows = businesses.flatMap((business) => (business.offers || []).map((offer) => ({ business, offer })));
  const live = rows.filter(({ offer }) => state(offer) === 'live').length;

  async function save(business: BusinessListing, offers: Offer[], message: string) {
    setBusy(business.id); setError('');
    try { await updateOwnerBusiness(business.id, { offers: payload(offers) }); await onChanged(); showToast(message); return true; }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save the offer.'); return false; }
    finally { setBusy(''); }
  }
  async function add() {
    const business = businesses.find((item) => item.id === target);
    if (!business) { setError('Choose a listing.'); return; }
    const existing = business.offers || [];
    const message = checkOffer(draft, existing.map((offer) => ({ title: offer.title })) as never);
    if (message) { setError(message); return; }
    const next: Offer = { id: '', title: draft.title.trim(), description: draft.description.trim(), code: draft.code.toUpperCase(), occasion: draft.occasion.trim(), validUntil: `${draft.validUntil}T23:59:59`, isActive: true };
    if (await save(business, [...existing, next], business.status === 'Active' ? 'Offer added — it’s live now.' : 'Offer added. It goes live when your listing is approved.')) { setAdding(false); setDraft({ title: '', occasion: '', validUntil: '', code: '', description: '' }); }
  }
  const toggle = (business: BusinessListing, offer: Offer) => save(business, (business.offers || []).map((item) => (item.id === offer.id ? { ...item, isActive: !item.isActive } : item)), offer.isActive ? 'Offer paused.' : 'Offer is live again.');
  const remove = async (business: BusinessListing, offer: Offer) => { if (await confirm({ title: `Delete “${offer.title}”?`, message: 'Customers will no longer see this offer.', confirmLabel: 'Delete offer', tone: 'danger' })) save(business, (business.offers || []).filter((item) => item.id !== offer.id), 'Offer deleted.'); };

  return (
    <main className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 px-4 pb-24 pt-8 md:px-8 lg:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2"><p className="font-eyebrow text-[#002fa7]">Offers</p><h1 className="text-[28px] font-semibold leading-9 tracking-[-0.0294em] md:text-[34px] md:leading-[42px]">Offers and deals</h1><p className="text-[16px] leading-6 text-[#4a4c55]">{live} live now. Live offers show on your profile and on the Offers page.</p></div>
        {!adding && businesses.length > 0 && <Button type="primary" onClick={() => setAdding(true)} icon={<Plus size={18} aria-hidden="true" />}>Add an offer</Button>}
      </div>

      {adding && (
        <section className="grid gap-4 rounded-[20px] border border-[#002fa7] bg-[#f7f9fd] p-5 sm:grid-cols-2 sm:p-6" aria-label="New offer">
          {businesses.length > 1 && <Field label="Listing" required className="sm:col-span-2"><select value={target} onChange={(event) => setTarget(event.target.value)} className={fieldClass}>{businesses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>}
          <Field label="Offer title" required className="sm:col-span-2"><input autoFocus value={draft.title} onChange={(event) => { setDraft({ ...draft, title: clean.text(event.target.value, 80) }); setError(''); }} maxLength={80} placeholder="e.g. 20% off Diwali party packages" className={fieldClass} /></Field>
          <Field label="Occasion" optional><input value={draft.occasion} onChange={(event) => setDraft({ ...draft, occasion: clean.place(event.target.value).slice(0, 30) })} maxLength={30} placeholder="e.g. Diwali" className={fieldClass} /></Field>
          <Field label="Valid until" required><input type="date" min={today()} value={draft.validUntil} onChange={(event) => { setDraft({ ...draft, validUntil: event.target.value }); setError(''); }} className={fieldClass} /></Field>
          <Field label="Coupon code" optional><input value={draft.code} onChange={(event) => { setDraft({ ...draft, code: event.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 20) }); setError(''); }} maxLength={20} placeholder="e.g. DIWALI20" className={fieldClass} /></Field>
          <Field label="Details" optional><input value={draft.description} onChange={(event) => setDraft({ ...draft, description: clean.text(event.target.value, 200) })} maxLength={200} placeholder="Conditions, who it’s for…" className={fieldClass} /></Field>
          {error && <p role="alert" className="text-[14px] leading-5 text-[#b42318] sm:col-span-2">{error}</p>}
          <div className="flex gap-3 sm:col-span-2"><Button type="primary" size="s" onClick={add} disabled={Boolean(busy)}>{busy ? 'Saving…' : 'Add offer'}</Button><Button type="ghost" size="s" onClick={() => { setAdding(false); setError(''); }}>Cancel</Button></div>
        </section>
      )}
      {!adding && error && <p role="alert" className="rounded-[10px] bg-[#fce9e7] px-4 py-3 text-[14px] text-[#b42318]">{error}</p>}

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[16px] border border-dashed border-[#bdbcb5] bg-white px-6 py-14 text-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-[#f1f1ee] text-[#002fa7]"><Tag size={22} aria-hidden="true" /></span><p className="text-[16px] font-medium">No offers yet</p><p className="max-w-[420px] text-[14px] text-[#4a4c55]">Festival and seasonal offers bring in customers who are ready to buy. Add your first one.</p>{!adding && businesses.length > 0 && <Button type="primary" size="s" onClick={() => setAdding(true)}>Add an offer</Button>}</div>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map(({ business, offer }) => {
            const status = state(offer);
            return (
              <li key={`${business.id}-${offer.id || offer.title}`} className="flex flex-col gap-3 rounded-[16px] border border-[#dcdbd5] bg-white p-5 sm:flex-row sm:items-center sm:p-6">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-[16px] font-semibold leading-6">{offer.title}</h2>{status === 'live' ? <Badge tone="live">Live</Badge> : status === 'paused' ? <Badge tone="pending">Paused</Badge> : <Badge tone="closed">Expired</Badge>}{offer.occasion && <span className="rounded-full bg-[#fbe6ec] px-2.5 py-0.5 font-eyebrow text-[11px]">{offer.occasion}</span>}</div>
                  <p className="mt-1 text-[14px] leading-5 text-[#4a4c55]">{business.name} · Valid till {when(offer.validUntil)}{offer.code ? ` · Code ${offer.code}` : ''}</p>
                  {offer.description && <p className="mt-1 text-[14px] leading-5 text-[#6e7079]">{offer.description}</p>}
                  {business.status !== 'Active' && <p className="mt-1 text-[13px] text-[#8a5a00]">Not visible yet — your listing isn’t live.</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  {status !== 'expired' && <Button type="secondary" size="s" onClick={() => toggle(business, offer)} disabled={busy === business.id}>{offer.isActive ? 'Pause' : 'Resume'}</Button>}
                  <button type="button" onClick={() => remove(business, offer)} aria-label={`Delete ${offer.title}`} disabled={busy === business.id} className={cx('grid h-11 w-11 place-items-center rounded-[12px] border border-[#dcdbd5] text-[#6e7079] hover:border-[#b42318] hover:text-[#b42318]')}><Trash2 size={18} /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
};
