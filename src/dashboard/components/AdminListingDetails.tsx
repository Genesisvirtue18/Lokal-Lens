import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { loadAdminBusiness, request } from '../api';
import { FIELD_LABELS, describeValue } from '@/lib/pending-changes';

type Raw = {
  tagline?: string; description?: string; businessType?: string; establishedYear?: number; serviceMode?: string; serviceAreas?: string[];
  address?: Record<string, string>; location?: { coordinates?: [number, number] }; locationApproximate?: boolean;
  serviceItems?: { name: string; priceFrom?: number; priceTo?: number; unit?: string }[]; services?: string[];
  workingHours?: { day: string; isClosed?: boolean; opens?: string; closes?: string }[]; specialHours?: { label?: string; date?: string; isClosed?: boolean; opens?: string; closes?: string }[];
  paymentModes?: string[]; languages?: string[]; priceRange?: string; amenities?: string[]; homeDelivery?: boolean;
  offers?: { title: string; description?: string; code?: string; validUntil?: string }[];
  phone?: string; alternatePhone?: string; whatsapp?: string; email?: string; website?: string; socialLinks?: Record<string, string>;
  faqs?: { question: string; answer: string }[]; images?: string[]; logo?: string;
  createdAt?: string; viewCount?: number; leadCount?: number; averageRating?: number; reviewCount?: number; slug?: string;
  category?: { name?: string } | string;
  pendingChanges?: { status?: 'pending' | 'rejected'; data?: Record<string, unknown>; submittedAt?: string; rejectionReason?: string; categoryNames?: Record<string, string> };
};

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const time = (value?: string) => { const [h, m] = String(value || '').split(':').map(Number); return Number.isNaN(h) ? '' : `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const money = (value?: number) => (value ? `₹${Number(value).toLocaleString('en-IN')}` : '');
const priceText = (service: { priceFrom?: number; priceTo?: number; unit?: string }) => (service.priceFrom ? `${service.priceTo ? '' : 'From '}${money(service.priceFrom)}${service.priceTo ? ` – ${money(service.priceTo)}` : ''}${service.unit ? ` / ${service.unit}` : ''}` : '');
const dayText = (date?: string) => { if (!date) return '—'; try { return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); } catch { return date; } };
const label = (value: string) => value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[14px] border border-[#dcdbd5] bg-white">
      <h4 className="border-b border-[#dcdbd5] bg-[#eef1fb] px-4 py-2.5 font-display text-[13px] font-semibold uppercase tracking-wide text-[#002fa7]">{title}</h4>
      <div className="px-4 py-1.5">{children}</div>
    </section>
  );
}
function Row({ name, children }: { name: string; children: React.ReactNode }) {
  return <div className="grid grid-cols-[120px_minmax(0,1fr)] items-start gap-x-4 border-b border-[#f1f1ee] py-2.5 text-[14px] leading-5 last:border-b-0"><dt className="text-[13px] font-medium text-[#6e7079]">{name}</dt><dd className="min-w-0 break-words font-medium text-[#101115]">{children}</dd></div>;
}
const none = <span className="font-normal italic text-[#9a9ba3]">Not added</span>;
const chips = (items?: string[]) => (items?.length ? <ul className="flex flex-wrap gap-1.5">{items.map((item) => <li key={item} className="rounded-full bg-[#f1f1ee] px-2.5 py-1 text-[13px]">{item}</li>)}</ul> : none);

// What an owner asked to change on an approved listing, next to what customers see now, with the decision.
function PendingChanges({ item, id, onDone }: { item: Raw; id: string; onDone: () => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const asked = item.pendingChanges?.data || {};
  const names = item.pendingChanges?.categoryNames || {};
  const rows = Object.keys(asked).map((key) => {
    const isCategory = key === 'category' || key === 'subcategories' || key === 'secondaryCategories';
    const show = (value: unknown) => (isCategory ? [value].flat().filter(Boolean).map((entry) => names[String(entry)] || '').filter(Boolean).join(', ') : describeValue(key, value));
    const now = isCategory ? (key === 'category' && item.category && typeof item.category === 'object' ? item.category.name || '' : '') : describeValue(key, (item as Record<string, unknown>)[key]);
    return { key, label: (FIELD_LABELS as Record<string, string>)[key] || key, now, next: show(asked[key]) };
  });
  async function decide(decision: 'approve' | 'reject') {
    if (decision === 'reject' && !reason.trim()) { setError('Tell the owner what to fix.'); return; }
    setBusy(true); setError('');
    try { await request(`/admin/businesses/${id}/changes`, { method: 'PATCH', body: JSON.stringify({ decision, ...(decision === 'reject' ? { reason: reason.trim() } : {}) }) }); window.dispatchEvent(new Event('admin-listings-changed')); onDone(); }
    catch (reasonError) { setError(reasonError instanceof Error ? reasonError.message : 'Unable to save the decision.'); }
    finally { setBusy(false); }
  }
  return (
    <section className="overflow-hidden rounded-[14px] border-2 border-[#e0b04a] bg-white">
      <h4 className="border-b border-[#e0b04a] bg-[#fbf0d9] px-4 py-2.5 font-display text-[13px] font-semibold uppercase tracking-wide text-[#5c3d00]">Changes waiting for approval ({rows.length})</h4>
      <div className="flex flex-col gap-3 px-4 py-3">
        <p className="text-[13px] leading-[18px] text-[#4a4c55]">Customers still see the current details. Nothing below is public until you approve it.</p>
        <ul className="flex flex-col divide-y divide-[#f1f1ee]">
          {rows.map((row) => (
            <li key={row.key} className="grid gap-1 py-2.5 text-[14px] leading-5">
              <span className="text-[13px] font-semibold text-[#101115]">{row.label}</span>
              <span className="grid grid-cols-[52px_minmax(0,1fr)] gap-x-3"><span className="text-[12px] font-medium uppercase tracking-wide text-[#6e7079]">Now</span><span className="break-words text-[#4a4c55] line-through decoration-[#b3261e]/40">{row.now || <span className="italic text-[#9a9ba3] no-underline">Not set</span>}</span></span>
              <span className="grid grid-cols-[52px_minmax(0,1fr)] gap-x-3"><span className="text-[12px] font-medium uppercase tracking-wide text-[#2b7a26]">Asked</span><span className="break-words font-medium text-[#101115]">{row.next || <span className="italic text-[#9a9ba3]">Removed</span>}</span></span>
            </li>
          ))}
        </ul>
        {error && <p role="alert" className="rounded-[10px] bg-[#fdecea] px-3 py-2 text-[14px] text-[#8c1d13]">{error}</p>}
        {rejecting ? (
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1.5 text-[14px] font-medium">What should the owner fix?<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={500} placeholder="The owner sees this on their dashboard and in an email" className="rounded-[10px] border border-[#bdbcb5] px-3 py-2 text-[14px] font-normal" /></label>
            <div className="flex gap-2"><button type="button" disabled={busy} onClick={() => void decide('reject')} className="h-10 rounded-[10px] bg-[#b42318] px-4 font-display text-[14px] font-semibold text-white disabled:opacity-60">{busy ? 'Saving…' : 'Reject changes'}</button><button type="button" onClick={() => { setRejecting(false); setError(''); }} className="h-10 px-3 text-[14px] font-medium text-[#002fa7]">Cancel</button></div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void decide('approve')} className="h-10 rounded-[10px] bg-[#002fa7] px-4 font-display text-[14px] font-semibold text-white disabled:opacity-60">{busy ? 'Saving…' : 'Approve and publish changes'}</button><button type="button" onClick={() => setRejecting(true)} className="h-10 rounded-[10px] border border-[#bdbcb5] bg-white px-4 font-display text-[14px] font-semibold">Reject…</button></div>
        )}
      </div>
    </section>
  );
}

// Everything the owner entered, read-only, so an admin can judge a listing before approving it.
export function AdminListingDetails({ id }: { id: string }) {
  const [state, setState] = useState<{ id: string; item?: Raw; error?: string }>({ id: '' });
  const [round, setRound] = useState(0);
  useEffect(() => {
    let live = true;
    loadAdminBusiness(id).then((item) => { if (live) setState({ id, item }); }).catch((reason) => { if (live) setState({ id, error: reason instanceof Error ? reason.message : 'Unable to load the full listing' }); });
    return () => { live = false; };
  }, [id, round]);
  if (state.id !== id) return <p className="px-6 py-5 text-[14px] text-[#6e7079]">Loading the full listing…</p>;
  if (state.error || !state.item) return <p role="alert" className="mx-6 my-5 rounded-[10px] bg-[#fdecea] px-3 py-2 text-[14px] text-[#8c1d13]">{state.error}</p>;
  const item = state.item;
  const address = item.address || {};
  const coords = item.location?.coordinates;
  const hours = DAY_ORDER.map((day) => item.workingHours?.find((entry) => String(entry.day).toLowerCase() === day)).filter(Boolean) as NonNullable<Raw['workingHours']>;
  const socials = Object.entries(item.socialLinks || {}).filter(([, value]) => value);
  const services: NonNullable<Raw['serviceItems']> = item.serviceItems?.length ? item.serviceItems : (item.services || []).map((name) => ({ name }));
  const photos = [...(item.images || [])];
  const today = new Date().toLocaleDateString('en-CA');
  const specialDays = [...(item.specialHours || [])].map((day) => ({ ...day, past: Boolean(day.date && day.date < today) })).sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));

  return (
    <div className="flex flex-col gap-4 px-6 py-5">
      {item.pendingChanges?.status === 'pending' && <PendingChanges item={item} id={id} onDone={() => setRound((value) => value + 1)} />}
      {photos.length > 0 ? (
        <Block title={`Photos (${photos.length})`}>
          <ul className="grid grid-cols-4 gap-2">{photos.slice(0, 8).map((src, index) => <li key={src + index}><a href={src} target="_blank" rel="noreferrer" className="relative block aspect-square overflow-hidden rounded-[10px] bg-[#f1f1ee]"><Image src={src} alt={`Photo ${index + 1}`} unoptimized fill sizes="120px" className="object-cover" /></a></li>)}</ul>
        </Block>
      ) : <Block title="Photos">{none}</Block>}

      <Block title="About">
        <dl className="flex flex-col">
          <Row name="Tagline">{item.tagline || none}</Row>
          <Row name="Description"><span className="whitespace-pre-line font-normal text-[#2f3138]">{item.description || none}</span></Row>
          <Row name="Type">{item.businessType ? label(item.businessType) : none}</Row>
          <Row name="Established">{item.establishedYear || none}</Row>
          <Row name="Serves">{item.serviceMode === 'visit' ? 'Customers visit the address' : item.serviceMode ? `${label(item.serviceMode)}${item.serviceAreas?.length ? `: ${item.serviceAreas.join(', ')}` : ''}` : none}</Row>
        </dl>
      </Block>

      <Block title="Contact">
        <dl className="flex flex-col">
          <Row name="Phone">{[item.phone, item.alternatePhone].filter(Boolean).join(' · ') || none}</Row>
          <Row name="WhatsApp">{item.whatsapp || none}</Row>
          <Row name="Email">{item.email || none}</Row>
          <Row name="Website">{item.website ? <a href={item.website} target="_blank" rel="noreferrer" className="text-[#002fa7] underline">{item.website}</a> : none}</Row>
          <Row name="Social">{socials.length ? <span className="flex flex-wrap gap-x-3">{socials.map(([name, url]) => <a key={name} href={url} target="_blank" rel="noreferrer" className="capitalize text-[#002fa7] underline">{name}</a>)}</span> : none}</Row>
        </dl>
      </Block>

      <Block title="Location">
        <dl className="flex flex-col">
          <Row name="Address">{[address.addressLine1, address.locality, address.city, address.state, address.postalCode].filter(Boolean).join(', ') || none}</Row>
          {address.landmark && <Row name="Landmark">{address.landmark}</Row>}
          <Row name="Map pin">{coords ? <a href={`https://www.openstreetmap.org/?mlat=${coords[1]}&mlon=${coords[0]}#map=18/${coords[1]}/${coords[0]}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#002fa7] underline">{item.locationApproximate ? 'Placed from the address' : 'Exact pin set by the owner'}<ExternalLink size={13} aria-hidden="true" /></a> : <span className="text-[#8a5a00]">No pin on the map</span>}</Row>
        </dl>
      </Block>

      <Block title="Opening hours">
        {hours.length ? <ul className="flex flex-col text-[14px]">{hours.map((entry) => <li key={entry.day} className="flex justify-between gap-4 border-b border-[#f1f1ee] py-2 last:border-b-0"><span className="capitalize">{entry.day}</span>{entry.isClosed ? <span className="text-[#6e7079]">Closed</span> : <span className="tabular-nums">{time(entry.opens)} – {time(entry.closes)}</span>}</li>)}</ul> : none}
      </Block>

      <Block title={`Special days${specialDays.length ? ` (${specialDays.length})` : ''}`}>
        {specialDays.length ? (
          <table className="w-full text-left text-[14px]">
            <thead><tr className="border-b border-[#f1f1ee] text-[12px] font-medium uppercase tracking-wide text-[#6e7079]"><th className="py-2 pr-3 font-medium">Occasion</th><th className="py-2 pr-3 font-medium">Date</th><th className="py-2 font-medium">Timing</th></tr></thead>
            <tbody>{specialDays.map((day, index) => (
              <tr key={`${day.date}-${index}`} className="border-b border-[#f1f1ee] align-top last:border-b-0">
                <td className="py-2.5 pr-3 font-medium text-[#101115]">{day.label || 'Special day'}{day.past && <span className="ml-2 rounded-full bg-[#f1f1ee] px-2 py-0.5 text-[11px] font-medium text-[#6e7079]">Past</span>}</td>
                <td className="py-2.5 pr-3 tabular-nums text-[#4a4c55]">{dayText(day.date)}</td>
                <td className="py-2.5">{day.isClosed !== false ? <span className="rounded-full bg-[#fdecea] px-2.5 py-0.5 text-[13px] font-medium text-[#8c1d13]">Closed all day</span> : <span className="rounded-full bg-[#e7f4e5] px-2.5 py-0.5 text-[13px] font-medium tabular-nums text-[#2b7a26]">{time(day.opens)} – {time(day.closes)}</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <p className="py-2.5 text-[14px]">{none}</p>}
      </Block>

      <Block title={`Services (${services.length})`}>
        {services.length ? <ul className="flex flex-col text-[14px]">{services.map((service) => <li key={service.name} className="flex justify-between gap-4 border-b border-[#f1f1ee] py-2 last:border-b-0"><span>{service.name}</span><span className="text-[#4a4c55]">{priceText(service)}</span></li>)}</ul> : none}
      </Block>

      <Block title="Good to know">
        <dl className="flex flex-col">
          <Row name="Payments">{chips(item.paymentModes?.map(label))}</Row>
          <Row name="Languages">{chips(item.languages)}</Row>
          <Row name="Facilities">{chips(item.amenities)}</Row>
          <Row name="Price level">{item.priceRange ? label(item.priceRange) : none}</Row>
          <Row name="Home delivery">{item.homeDelivery ? 'Yes' : 'No'}</Row>
        </dl>
      </Block>

      {item.offers?.length ? <Block title={`Offers (${item.offers.length})`}><ul className="flex flex-col gap-1.5 text-[14px]">{item.offers.map((offer) => <li key={offer.title}><span className="font-medium">{offer.title}</span>{offer.code ? ` · code ${offer.code}` : ''}{offer.validUntil ? ` · until ${new Date(offer.validUntil).toLocaleDateString('en-IN')}` : ''}{offer.description ? <span className="block text-[#4a4c55]">{offer.description}</span> : null}</li>)}</ul></Block> : null}
      {item.faqs?.length ? <Block title={`Questions (${item.faqs.length})`}><ul className="flex flex-col gap-2 text-[14px]">{item.faqs.map((faq) => <li key={faq.question}><span className="font-medium">{faq.question}</span><span className="block text-[#4a4c55]">{faq.answer}</span></li>)}</ul></Block> : null}

      <Block title="Activity">
        <p className="text-[14px] text-[#4a4c55]">{item.viewCount || 0} profile views · {item.leadCount || 0} inquiries · {item.reviewCount || 0} reviews{item.averageRating ? ` (${Number(item.averageRating).toFixed(1)} average)` : ''} · created {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</p>
      </Block>
    </div>
  );
}
