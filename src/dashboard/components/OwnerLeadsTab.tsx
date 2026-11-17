import React, { useMemo, useState } from 'react';
import { Mail, MessageCircle, Phone, Search } from 'lucide-react';
import { cx } from '@/components/ds';
import { Lead } from '../types';

interface OwnerLeadsTabProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onBackToDashboard?: () => void;
  onStatusChange?: (leadId: string, status: Lead['status']) => void;
}

const tone: Record<Lead['status'], string> = { New: 'bg-[#e6ebf7] text-[#002fa7]', Contacted: 'bg-[#fbf0d9] text-[#8a5a00]', Converted: 'bg-[#e7f4e5] text-[#2b7a26]' };
const digits = (value: string) => value.replace(/\D/g, '');

// The inbox of customer inquiries: filter, search, call / WhatsApp / email in one tap, and move each one along.
export const OwnerLeadsTab: React.FC<OwnerLeadsTabProps> = ({ leads, onSelectLead, onStatusChange }) => {
  const [filter, setFilter] = useState<'All' | Lead['status']>('All');
  const [search, setSearch] = useState('');
  const counts = useMemo(() => ({ All: leads.length, New: leads.filter((l) => l.status === 'New').length, Contacted: leads.filter((l) => l.status === 'Contacted').length, Converted: leads.filter((l) => l.status === 'Converted').length }), [leads]);
  const term = search.trim().toLowerCase();
  const filtered = leads.filter((lead) => (filter === 'All' || lead.status === filter) && (!term || [lead.name, lead.message, lead.phone, lead.email || '', lead.service || '', lead.targetBusiness].some((value) => value.toLowerCase().includes(term))));

  return (
    <main className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 px-4 pb-24 pt-8 md:px-8 lg:pt-10">
      <div className="flex flex-col gap-2"><p className="font-eyebrow text-[#002fa7]">Inquiries</p><h1 className="text-[28px] font-semibold leading-9 tracking-[-0.0294em] md:text-[34px] md:leading-[42px]">Customer inquiries</h1><p className="text-[16px] leading-6 text-[#4a4c55]">Reply fast — customers usually contact two or three businesses.</p></div>

      <div className="flex flex-wrap items-center gap-3">
        {(['All', 'New', 'Contacted', 'Converted'] as const).map((status) => <button key={status} type="button" onClick={() => setFilter(status)} aria-pressed={filter === status} className={cx('inline-flex h-10 items-center rounded-full border px-4 font-display text-[14px] font-medium', filter === status ? 'border-[#002fa7] bg-[#e6ebf7] text-[#002fa7]' : 'border-[#dcdbd5] bg-white hover:border-[#101115]')}>{status} ({counts[status]})</button>)}
        <label className="ml-auto flex h-10 w-full items-center gap-2 rounded-[10px] border border-[#bdbcb5] bg-white px-3 sm:w-72"><Search size={16} className="shrink-0 text-[#6e7079]" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone, message" aria-label="Search inquiries" className="w-full bg-transparent text-[14px] outline-none placeholder:text-[#6e7079]" /></label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-[#bdbcb5] bg-white px-6 py-14 text-center"><p className="text-[16px] font-medium">{leads.length ? 'No inquiries match this filter.' : 'No inquiries yet'}</p><p className="mt-1 text-[14px] text-[#4a4c55]">{leads.length ? 'Try another status or search.' : 'When a customer fills the inquiry form on your live profile, it shows up here — and we email you.'}</p></div>
      ) : (
        <ul className="flex flex-col gap-4">
          {filtered.map((lead) => (
            <li key={lead.id} className="flex flex-col gap-3 rounded-[16px] border border-[#dcdbd5] bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fbe6ec] font-display text-[15px] font-semibold text-[#7a2842]">{(lead.name || '?')[0].toUpperCase()}</span>
                <div className="min-w-0 flex-1"><p className="font-display text-[16px] font-semibold leading-6">{lead.name}</p><p className="text-[13px] leading-[18px] text-[#6e7079]">{lead.timestamp} · {lead.targetBusiness}{lead.service ? ` · ${lead.service}` : ''}</p></div>
                <span className={cx('rounded-full px-2.5 py-1 text-[12px] font-semibold', tone[lead.status])}>{lead.status}</span>
              </div>
              <p className="whitespace-pre-line rounded-[12px] bg-[#f1f1ee] px-4 py-3 text-[15px] leading-6">{lead.message}</p>
              <div className="flex flex-wrap items-center gap-2">
                {lead.phone && <a href={`tel:${lead.phone}`} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#002fa7] px-3.5 font-display text-[14px] font-medium text-white hover:bg-[#00248a]"><Phone size={16} aria-hidden="true" />Call {lead.phone}</a>}
                {lead.phone && <a href={`https://wa.me/${digits(lead.phone).length === 10 ? `91${digits(lead.phone)}` : digits(lead.phone)}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#bdbcb5] px-3.5 font-display text-[14px] font-medium hover:border-[#101115]"><MessageCircle size={16} aria-hidden="true" />WhatsApp</a>}
                {lead.email && <a href={`mailto:${lead.email}`} className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#bdbcb5] px-3.5 font-display text-[14px] font-medium hover:border-[#101115]"><Mail size={16} aria-hidden="true" />Email</a>}
                <span className="ml-auto flex items-center gap-2">
                  {onStatusChange && <select aria-label={`Status for ${lead.name}`} value={lead.status} onChange={(event) => onStatusChange(lead.id, event.target.value as Lead['status'])} className="h-10 rounded-[10px] border border-[#bdbcb5] bg-white px-2.5 text-[14px]"><option>New</option><option>Contacted</option><option>Converted</option></select>}
                  <button type="button" onClick={() => onSelectLead(lead)} className="h-10 rounded-[10px] px-3 font-display text-[14px] font-medium text-[#002fa7] hover:bg-[#e6ebf7]">Notes</button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
};
