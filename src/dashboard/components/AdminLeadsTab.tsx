import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Mail, MessageCircle, Phone, Search } from 'lucide-react';
import { Button, cx } from '@/components/ds';
import { AdminLead, loadAdminLeads, Paged } from '../api';
import { whatsappLink } from '../contact';

const field = 'h-10 rounded-[10px] border border-[#bdbcb5] bg-white px-3 text-[14px] outline-none focus:border-2 focus:border-[#002fa7]';
const TONE = { new: 'bg-[#e6ebf7] text-[#002fa7]', contacted: 'bg-[#fbf0d9] text-[#8a5a00]', converted: 'bg-[#e7f4e5] text-[#2b7a26]' } as const;
const when = (value?: string) => (value ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');

// Every inquiry customers sent, and which owner it went to. The owner replies from their own dashboard.
export const AdminLeadsTab: React.FC<{ onOpenBusiness: (id: string) => void; onOpenPerson: (id: string) => void }> = ({ onOpenBusiness, onOpenPerson }) => {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ key: string; data?: Paged<AdminLead>; error?: string }>({ key: '' });

  useEffect(() => { const timer = setTimeout(() => { setTerm(search.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);
  const key = JSON.stringify([status, term, page]);
  useEffect(() => {
    let live = true;
    loadAdminLeads({ status, search: term, page, limit: 20 }).then((data) => { if (live) setResult({ key, data }); }).catch((reason) => { if (live) setResult({ key, error: reason instanceof Error ? reason.message : 'Unable to load inquiries' }); });
    return () => { live = false; };
  }, [key, status, term, page]);
  const loading = result.key !== key;
  const rows = result.data?.items || [];
  const total = result.data?.pagination.totalItems || 0;

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 pb-24 pt-8 md:px-8 lg:pt-10">
      <div className="flex flex-col gap-2"><p className="font-eyebrow text-[#002fa7]">Admin</p><h1 className="text-[28px] font-semibold leading-9 tracking-[-0.0294em] md:text-[34px] md:leading-[42px]">Inquiries</h1><p className="text-[16px] leading-6 text-[#4a4c55]">Every message customers sent to a business, and which owner received it. Use it to check that owners are replying.</p></div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-[10px] border border-[#bdbcb5] bg-white px-3 focus-within:border-2 focus-within:border-[#002fa7]"><Search size={16} className="shrink-0 text-[#6e7079]" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, phone or message" aria-label="Search inquiries" className="w-full bg-transparent text-[14px] outline-none" /></label>
        <select aria-label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={field}><option value="all">Any status</option><option value="new">New</option><option value="contacted">Contacted</option><option value="converted">Converted</option></select>
      </div>

      {result.error && <p role="alert" className="rounded-[10px] bg-[#fdecea] px-4 py-3 text-[14px] text-[#8c1d13]">{result.error}</p>}

      <div className={cx('overflow-hidden rounded-[16px] border border-[#dcdbd5] bg-white transition-opacity', loading && 'opacity-60')}>
        {!rows.length ? <p className="px-6 py-14 text-center text-[15px] text-[#4a4c55]">{loading ? 'Loading…' : total === 0 && status === 'all' && !term ? 'No inquiries yet. They appear here when customers contact a business.' : 'No inquiries match these filters.'}</p> : (
          <ul>{rows.map((lead) => (
            <li key={lead._id} className="flex flex-col gap-2 border-b border-[#ecebe7] px-5 py-4 last:border-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-display text-[15px] font-semibold">{lead.name}</span>
                <span className={cx('rounded-full px-2.5 py-0.5 text-[12px] font-semibold capitalize', TONE[lead.status])}>{lead.status}</span>
                <span className="text-[13px] text-[#6e7079]">{when(lead.createdAt)}{lead.service ? ` · ${lead.service}` : ''}</span>
                <span className="ml-auto flex flex-wrap items-center gap-x-2 text-[14px]">
                  {lead.business ? <button type="button" onClick={() => onOpenBusiness(lead.business!._id)} className="font-medium text-[#002fa7] hover:underline">{lead.business.name}</button> : <span className="text-[#6e7079]">Business removed</span>}
                  <span className="text-[#6e7079]">→</span>
                  {lead.business?.owner ? <button type="button" onClick={() => onOpenPerson(lead.business!.owner!._id)} className="hover:text-[#002fa7] hover:underline">{lead.business.owner.name}</button> : <span className="font-medium text-[#8a5a00]">No owner assigned</span>}
                </span>
              </div>
              <p className="whitespace-pre-line rounded-[10px] bg-[#f7f7f4] px-4 py-3 text-[15px] leading-6">{lead.message}</p>
              <div className="flex flex-wrap items-center gap-2">
                <a href={`tel:${lead.phone}`} className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#bdbcb5] px-3 font-display text-[14px] font-medium hover:border-[#101115]"><Phone size={15} aria-hidden="true" />{lead.phone}</a>
                <a href={whatsappLink({ name: lead.name, phone: lead.phone, service: lead.service, targetBusiness: lead.business?.name || '' })} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#bdbcb5] px-3 font-display text-[14px] font-medium hover:border-[#101115]"><MessageCircle size={15} aria-hidden="true" />WhatsApp</a>
                {lead.email && <a href={`mailto:${lead.email}`} className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#bdbcb5] px-3 font-display text-[14px] font-medium hover:border-[#101115]"><Mail size={15} aria-hidden="true" />{lead.email}</a>}
              </div>
            </li>
          ))}</ul>
        )}
        {total > 20 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ecebe7] bg-[#f7f7f4] px-5 py-3 text-[14px] text-[#4a4c55]">
            <span>{(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</span>
            <span className="flex items-center gap-2"><Button type="secondary" size="s" onClick={() => setPage(page - 1)} disabled={page === 1} icon={<ChevronLeft size={16} aria-hidden="true" />}>Previous</Button><span>Page {page} of {result.data?.pagination.totalPages}</span><Button type="secondary" size="s" onClick={() => setPage(page + 1)} disabled={!result.data || page >= result.data.pagination.totalPages} trailingIcon={<ChevronRight size={16} aria-hidden="true" />}>Next</Button></span>
          </div>
        )}
      </div>
    </main>
  );
};
