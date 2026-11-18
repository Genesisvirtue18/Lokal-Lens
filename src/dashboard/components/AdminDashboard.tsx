import React from 'react';
import { BadgeCheck, ChevronRight, ClipboardCheck, Store, UserX } from 'lucide-react';
import { Badge, Button } from '@/components/ds';
import { BusinessListing, Lead } from '../types';

interface AdminDashboardProps {
  pendingBusinesses: BusinessListing[];
  activeBusinesses: BusinessListing[];
  adminLeads: Lead[];
  onApproveBusiness: (id: string) => void;
  onRejectBusiness: (id: string) => void;
  onInspectBusiness: (business: BusinessListing) => void;
  onViewAllPending: () => void;
  onOpenAddCategory?: () => void;
  onExportData?: () => void;
  onSelectLead?: (lead: Lead) => void;
}

function Stat({ label, value, note, icon: Icon, onClick }: { label: string; value: number; note?: string; icon: React.ComponentType<{ size?: number }>; onClick?: () => void }) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-3"><p className="font-display text-[14px] font-medium leading-5 text-[#4a4c55]">{label}</p><span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#e6ebf7] text-[#002fa7]"><Icon size={18} /></span></div>
      <p className="text-[28px] font-semibold leading-9 tracking-[-0.02em] tabular-nums sm:text-[32px]">{value.toLocaleString('en-IN')}</p>
      {note && <p className="text-[13px] leading-[18px] text-[#6e7079]">{note}</p>}
    </>
  );
  const cls = 'flex flex-col gap-2 rounded-[16px] border border-[#dcdbd5] bg-white p-4 text-left sm:gap-3 sm:p-5';
  return onClick ? <button type="button" onClick={onClick} className={`${cls} transition-colors hover:border-[#101115]`}>{body}</button> : <div className={cls}>{body}</div>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ pendingBusinesses, activeBusinesses, adminLeads, onApproveBusiness, onInspectBusiness, onViewAllPending }) => {
  const all = [...pendingBusinesses, ...activeBusinesses];
  const live = all.filter((item) => item.status === 'Active').length;
  const kycToCheck = all.filter((item) => item.kycStatus === 'submitted');
  const unowned = all.filter((item) => !item.ownerId).length;
  const categories = Object.entries(all.reduce<Record<string, number>>((counts, item) => ({ ...counts, [item.category]: (counts[item.category] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  const top = categories[0]?.[1] || 1;
  const attention = [...pendingBusinesses.map((item) => ({ item, why: 'New listing waiting for approval' })), ...kycToCheck.filter((item) => item.status !== 'Pending').map((item) => ({ item, why: 'Verification documents to check' }))];

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-8 px-4 pb-24 pt-8 md:px-8 lg:pt-10">
      <div className="flex flex-col gap-2"><p className="font-eyebrow text-[#002fa7]">Admin</p><h1 className="text-[28px] font-semibold leading-9 tracking-[-0.0294em] md:text-[34px] md:leading-[42px]">Overview</h1><p className="text-[16px] leading-6 text-[#4a4c55]">What needs your attention and how the directory is doing.</p></div>

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat icon={Store} label="All listings" value={all.length} note={`${live} live`} onClick={onViewAllPending} />
        <Stat icon={ClipboardCheck} label="Waiting for approval" value={pendingBusinesses.length} note={pendingBusinesses.length ? 'Review them below' : 'All caught up'} />
        <Stat icon={BadgeCheck} label="Verification to check" value={kycToCheck.length} note="GST or documents submitted" />
        <Stat icon={UserX} label="Without an owner" value={unowned} note={`${adminLeads.length} customer inquiries so far`} />
      </section>

      <section className="flex flex-col gap-4 rounded-[20px] border border-[#dcdbd5] bg-white p-6" aria-label="Needs attention">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-[18px] font-semibold leading-[26px]">Needs your attention</h2><p className="text-[14px] leading-5 text-[#4a4c55]">Open a listing to read its details before you approve it.</p></div><Button type="ghost" size="s" onClick={onViewAllPending} trailingIcon={<ChevronRight size={18} aria-hidden="true" />}>All businesses</Button></div>
        {attention.length ? (
          <ul className="flex flex-col divide-y divide-[#ecebe7]">
            {attention.slice(0, 8).map(({ item, why }) => (
              <li key={`${item.id}-${why}`} className="flex flex-wrap items-center gap-3 py-3.5">
                <div className="min-w-0 flex-1"><p className="truncate font-display text-[15px] font-semibold leading-5">{item.name}</p><p className="truncate text-[13px] leading-[18px] text-[#6e7079]">{item.category} · {item.location} · {item.owner}</p></div>
                <Badge tone="pending">{why}</Badge>
                <div className="flex gap-2"><Button type="secondary" size="s" onClick={() => onInspectBusiness(item)}>Review</Button>{item.status === 'Pending' && <Button type="primary" size="s" onClick={() => onApproveBusiness(item.id)} disabled={item.googlePlaceVerificationStatus === 'mismatch'}>Approve</Button>}</div>
              </li>
            ))}
          </ul>
        ) : <p className="rounded-[12px] bg-[#f7f7f4] px-4 py-8 text-center text-[14px] text-[#4a4c55]">Nothing waiting. New listings and verification requests will show up here.</p>}
      </section>

      <section className="flex flex-col gap-4 rounded-[20px] border border-[#dcdbd5] bg-white p-6" aria-label="Listings by category">
        <h2 className="text-[18px] font-semibold leading-[26px]">Listings by category</h2>
        {categories.length ? <ul className="flex flex-col gap-3">{categories.map(([name, count]) => <li key={name} className="grid grid-cols-[minmax(120px,220px)_1fr_48px] items-center gap-3 text-[14px]"><span className="truncate text-[#101115]">{name}</span><span className="h-2 overflow-hidden rounded-full bg-[#e4e3de]"><span className="block h-full rounded-full bg-[#002fa7]" style={{ width: `${Math.max(4, (count / top) * 100)}%` }} /></span><span className="text-right tabular-nums text-[#4a4c55]">{count}</span></li>)}</ul> : <p className="text-[14px] text-[#4a4c55]">No listings yet.</p>}
      </section>
    </main>
  );
};
