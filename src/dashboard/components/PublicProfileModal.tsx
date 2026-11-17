import React, { useEffect } from 'react';
import { BadgeCheck, Clock, Globe, Mail, MapPin, Phone, X } from 'lucide-react';
import { Badge, Button, cx } from '@/components/ds';
import { BusinessListing } from '../types';

interface PublicProfileModalProps { isOpen: boolean; onClose: () => void; business: BusinessListing; }

const time = (value?: string) => {
  const [hours, minutes] = String(value || '').split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '';
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
};

// "This is how customers see your listing." Shown for pending and live listings.
export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({ isOpen, onClose, business }) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [isOpen, onClose]);
  if (!isOpen) return null;

  const address = business.address || {};
  const fullAddress = [address.addressLine1, address.addressLine2, address.landmark, address.locality, address.city, address.state, address.postalCode].filter(Boolean).join(', ');
  const hours = business.workingHours || [];
  const photos = [...new Set([...(business.images || []), business.logo].filter(Boolean))] as string[];
  const live = business.status === 'Active';
  const contacts: [React.ComponentType<{ size?: number; className?: string }>, string, string | undefined][] = [
    [Phone, 'Call', business.phone], [Phone, 'Alternate', business.alternatePhone], [Phone, 'WhatsApp', business.whatsapp], [Mail, 'Email', business.email], [Globe, 'Website', business.website],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#101115]/60 sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="business-preview-title" className="flex max-h-[94vh] w-full max-w-[920px] flex-col overflow-hidden rounded-t-[24px] bg-[#f1f1ee] shadow-2xl sm:max-h-[90vh] sm:rounded-[24px]">
        <header className="flex items-center justify-between gap-3 border-b border-[#dcdbd5] bg-white px-5 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[#fbe6ec] px-2.5 py-1 font-eyebrow text-[11px] text-[#101115]">Preview</span>
            <p className="text-[14px] leading-5 text-[#4a4c55]">{live ? 'This is how customers see your listing.' : 'Customers can’t see this yet. It goes live after review.'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close preview" className="grid h-10 w-10 place-items-center rounded-full hover:bg-[#f1f1ee]"><X size={20} aria-hidden="true" /></button>
        </header>

        <div className="overflow-y-auto">
          {photos.length > 0 ? (
            <div className="grid gap-2 bg-white p-3 sm:grid-cols-[2fr_1fr] sm:p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photos[0]} alt={`${business.name} main photo`} className="h-[200px] w-full rounded-[14px] object-cover sm:h-[280px]" />
              {photos.length > 1 && <div className="hidden grid-cols-2 gap-2 sm:grid">{photos.slice(1, 5).map((url, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={`${url}-${index}`} src={url} alt={`${business.name} photo ${index + 2}`} className="h-[136px] w-full rounded-[12px] object-cover" />
              ))}</div>}
            </div>
          ) : (
            <div className="m-3 grid h-[140px] place-items-center rounded-[14px] border border-dashed border-[#bdbcb5] bg-white text-center text-[14px] text-[#6e7079] sm:m-4">No photos yet. Listings with photos get far more calls.</div>
          )}

          <div className="grid gap-6 p-4 sm:p-6 md:grid-cols-[minmax(0,1fr)_300px]">
            <div className="flex min-w-0 flex-col gap-6">
              <div className="flex flex-col gap-2">
                <p className="font-eyebrow text-[#002fa7]">{[business.category, address.locality || address.city].filter(Boolean).join(' · ')}</p>
                <h2 id="business-preview-title" className="text-[28px] font-semibold leading-9 tracking-[-0.0294em]">{business.name}</h2>
                <div className="flex flex-wrap items-center gap-2">
                  {business.verified ? <Badge tone="verified">Verified business</Badge> : <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ecebe7] px-2.5 py-1 text-[13px] text-[#4a4c55]"><BadgeCheck size={14} aria-hidden="true" />Not verified yet</span>}
                  {business.averageRating ? <span className="text-[14px]"><strong>{Number(business.averageRating).toFixed(1)}</strong> <span className="text-[#6e7079]">({business.reviewsCount || 0} reviews)</span></span> : <span className="text-[14px] text-[#6e7079]">No reviews yet</span>}
                </div>
              </div>

              <section className="flex flex-col gap-2"><h3 className="font-display text-[16px] font-semibold">About</h3><p className="whitespace-pre-wrap text-[16px] leading-6">{business.description || 'No description added yet.'}</p></section>

              <section className="flex flex-col gap-2">
                <h3 className="font-display text-[16px] font-semibold">Services</h3>
                {business.services?.length ? <ul className="overflow-hidden rounded-[12px] border border-[#dcdbd5] bg-white">{business.services.map((service, index) => <li key={`${service}-${index}`} className={cx('flex items-center justify-between gap-4 px-4 py-3 text-[15px]', index && 'border-t border-[#ecebe7]')}><span className="font-medium">{service}</span><span className="font-display text-[13px] font-medium text-[#002fa7]">Contact for pricing</span></li>)}</ul> : <p className="text-[14px] text-[#6e7079]">No services added yet.</p>}
              </section>
            </div>

            <aside className="flex flex-col gap-4">
              <section className="flex flex-col gap-3 rounded-[16px] border border-[#dcdbd5] bg-white p-4">
                <h3 className="font-display text-[16px] font-semibold">Contact</h3>
                {contacts.filter(([, , value]) => value && value !== 'Not added').map(([Icon, label, value]) => <p key={label} className="flex items-start gap-2.5 text-[14px] leading-5"><Icon size={16} className="mt-0.5 shrink-0 text-[#6e7079]" aria-hidden="true" /><span className="min-w-0"><span className="block text-[12px] text-[#6e7079]">{label}</span><span className="break-words">{value}</span></span></p>)}
                {!contacts.some(([, , value]) => value) && <p className="text-[14px] text-[#6e7079]">No contact details added.</p>}
              </section>
              <section className="flex flex-col gap-2 rounded-[16px] border border-[#dcdbd5] bg-white p-4">
                <h3 className="flex items-center gap-2 font-display text-[16px] font-semibold"><MapPin size={16} aria-hidden="true" />Address</h3>
                <p className="text-[14px] leading-5 text-[#4a4c55]">{fullAddress || 'No address added.'}</p>
              </section>
              <section className="flex flex-col gap-2 rounded-[16px] border border-[#dcdbd5] bg-white p-4">
                <h3 className="flex items-center gap-2 font-display text-[16px] font-semibold"><Clock size={16} aria-hidden="true" />Hours</h3>
                {hours.length ? hours.map((entry) => <p key={entry.day} className="flex justify-between gap-3 text-[14px] leading-5"><span className="capitalize">{entry.day}</span><span className={entry.isClosed ? 'text-[#b42318]' : 'text-[#4a4c55]'}>{entry.isClosed ? 'Closed' : `${time(entry.opens)} – ${time(entry.closes)}`}</span></p>) : <p className="text-[14px] text-[#6e7079]">Hours not added.</p>}
              </section>
            </aside>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-[#dcdbd5] bg-white px-5 py-3 sm:px-6">
          {live && <Button type="secondary" size="s" href={`/directory/${business.id}`} target="_blank" rel="noreferrer">Open public page</Button>}
          <Button type="primary" size="s" onClick={onClose}>Done</Button>
        </footer>
      </div>
    </div>
  );
};
