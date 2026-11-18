import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, ChevronDown, ExternalLink, LogOut, Settings } from 'lucide-react';
import { cx } from '@/components/ds';
import { Lead, OwnerTab, Review } from '../types';
import { OwnerUser } from './OwnerAccountTab';

const titles: Record<OwnerTab, string> = { business: 'Overview', leads: 'Inquiries', reviews: 'Reviews', analytics: 'Analytics', offers: 'Offers', settings: 'Account settings', form: 'Your listing' };
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';

interface Props { user: OwnerUser | null; tab: OwnerTab; leads: Lead[]; reviews?: Review[]; onGoReviews?: () => void; onOpenLead: (lead: Lead) => void; onGoLeads: () => void; onAccount: () => void; onLogout: () => void }

// Desktop top bar: where you are, new inquiries (bell), and who is signed in (account menu).
export const OwnerTopBar: React.FC<Props> = ({ user, tab, leads, reviews = [], onGoReviews, onOpenLead, onGoLeads, onAccount, onLogout }) => {
  const [open, setOpen] = useState<'' | 'bell' | 'user'>('');
  const box = useRef<HTMLDivElement>(null);
  const fresh = leads.filter((lead) => lead.status === 'New');
  const needReply = reviews.filter((review) => !review.reply);
  const total = fresh.length + needReply.length;

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: MouseEvent) => { if (box.current && !box.current.contains(event.target as Node)) setOpen(''); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(''); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const item = 'flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left font-display text-[14px] font-medium hover:bg-[#f1f1ee]';
  return (
    <div className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-[#dcdbd5] bg-white/95 px-8 backdrop-blur lg:flex">
      <p className="font-display text-[15px] font-medium text-[#4a4c55]">{titles[tab]}</p>
      <div ref={box} className="flex items-center gap-2">
        <Link href="/" target="_blank" className="hidden h-10 items-center gap-1.5 rounded-[10px] px-3 font-display text-[14px] font-medium text-[#4a4c55] hover:bg-[#f1f1ee] xl:flex">View site<ExternalLink size={15} aria-hidden="true" /></Link>

        <div className="relative">
          <button type="button" onClick={() => setOpen(open === 'bell' ? '' : 'bell')} aria-label={`Notifications${total ? `, ${total} new` : ''}`} aria-expanded={open === 'bell'} className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-[#f1f1ee]"><Bell size={20} aria-hidden="true" />{total > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#b42318] px-1 text-[10px] font-semibold text-white">{total}</span>}</button>
          {open === 'bell' && (
            <div className="absolute right-0 top-12 w-[340px] overflow-hidden rounded-[16px] border border-[#dcdbd5] bg-white shadow-[0_8px_24px_rgba(16,17,21,.12)]">
              <p className="border-b border-[#ecebe7] px-4 py-3 font-display text-[15px] font-semibold">Notifications</p>
              {fresh.length ? <p className="px-4 pt-3 font-eyebrow text-[#6e7079]">New inquiries</p> : null}
              {fresh.length ? fresh.slice(0, 5).map((lead) => <button key={lead.id} type="button" onClick={() => { setOpen(''); onOpenLead(lead); }} className="flex w-full flex-col gap-0.5 border-b border-[#ecebe7] px-4 py-3 text-left last:border-0 hover:bg-[#f7f7f4]"><span className="text-[14px] font-semibold">{lead.name} <span className="font-normal text-[#6e7079]">· {lead.timestamp}</span></span><span className="line-clamp-1 text-[13px] text-[#4a4c55]">{lead.message}</span></button>) : needReply.length ? null : <p className="px-4 py-6 text-center text-[14px] text-[#6e7079]">You’re all caught up.</p>}
              {needReply.length > 0 && (
                <div className="border-t border-[#ecebe7]">
                  <p className="px-4 pt-3 font-eyebrow text-[#6e7079]">Reviews waiting for your reply</p>
                  {needReply.slice(0, 3).map((review) => <button key={review.id} type="button" onClick={() => { setOpen(''); onGoReviews?.(); }} className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-[#f7f7f4]"><span className="text-[14px] font-semibold">{'★'.repeat(Math.max(0, Math.min(5, review.rating)))} <span className="font-normal text-[#6e7079]">{review.author}{review.businessName ? ` · ${review.businessName}` : ''}</span></span>{review.comment && <span className="line-clamp-1 text-[13px] text-[#4a4c55]">{review.comment}</span>}</button>)}
                </div>
              )}
              <button type="button" onClick={() => { setOpen(''); onGoLeads(); }} className="w-full border-t border-[#ecebe7] px-4 py-3 text-center font-display text-[14px] font-medium text-[#002fa7] hover:bg-[#f7f7f4]">View all inquiries</button>
            </div>
          )}
        </div>

        <div className="relative">
          <button type="button" onClick={() => setOpen(open === 'user' ? '' : 'user')} aria-haspopup="menu" aria-expanded={open === 'user'} className="flex h-11 items-center gap-2.5 rounded-full py-1 pl-1 pr-3 hover:bg-[#f1f1ee]">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#002fa7] font-display text-[14px] font-semibold text-white">{initials(user?.name)}</span>
            <span className="hidden max-w-[160px] text-left md:block"><span className="block truncate font-display text-[14px] font-semibold leading-5">{user?.name || 'Your account'}</span><span className="block truncate text-[12px] leading-4 text-[#6e7079]">{user?.email}</span></span>
            <ChevronDown size={16} className={cx('text-[#6e7079] transition', open === 'user' && 'rotate-180')} aria-hidden="true" />
          </button>
          {open === 'user' && (
            <div role="menu" className="absolute right-0 top-12 w-[260px] rounded-[16px] border border-[#dcdbd5] bg-white p-2 shadow-[0_8px_24px_rgba(16,17,21,.12)]">
              <div className="px-3 py-2.5"><p className="truncate font-display text-[15px] font-semibold">{user?.name}</p><p className="truncate text-[13px] text-[#6e7079]">{user?.email}</p></div>
              <div className="my-1 h-px bg-[#ecebe7]" />
              <button type="button" role="menuitem" onClick={() => { setOpen(''); onAccount(); }} className={item}><Settings size={18} aria-hidden="true" />Account settings</button>
              <button type="button" role="menuitem" onClick={() => { setOpen(''); onLogout(); }} className={item}><LogOut size={18} aria-hidden="true" />Log out</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
