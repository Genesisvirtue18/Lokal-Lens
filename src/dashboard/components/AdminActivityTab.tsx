import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button, cx } from '@/components/ds';
import { AdminActivity, loadAdminActivity, Paged } from '../api';

const TYPES: [string, string][] = [['all', 'Everything'], ['business', 'Listings'], ['user', 'People'], ['review', 'Reviews'], ['report', 'Reports'], ['claim', 'Claims'], ['category', 'Categories']];
const stamp = (value: string) => new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// A record of every change an admin made: who, what, to which item, and when.
export const AdminActivityTab: React.FC<{ onOpenBusiness: (id: string) => void; onOpenPerson: (id: string) => void }> = ({ onOpenBusiness, onOpenPerson }) => {
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ key: string; data?: Paged<AdminActivity>; error?: string }>({ key: '' });
  useEffect(() => { const timer = setTimeout(() => { setTerm(search.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);
  const key = JSON.stringify([type, term, page]);
  useEffect(() => {
    let live = true;
    loadAdminActivity({ type, search: term, page, limit: 30 }).then((data) => { if (live) setResult({ key, data }); }).catch((reason) => { if (live) setResult({ key, error: reason instanceof Error ? reason.message : 'Unable to load activity' }); });
    return () => { live = false; };
  }, [key, type, term, page]);
  const loading = result.key !== key;
  const rows = result.data?.items || [];
  const total = result.data?.pagination.totalItems || 0;
  const open = (row: AdminActivity) => { if (!row.targetId) return; if (row.targetType === 'business' || row.targetType === 'review') onOpenBusiness(row.targetId); else if (row.targetType === 'user') onOpenPerson(row.targetId); };

  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 pb-24 pt-8 md:px-8 lg:pt-10">
      <div className="flex flex-col gap-2"><p className="font-eyebrow text-[#002fa7]">Admin</p><h1 className="text-[28px] font-semibold leading-9 tracking-[-0.0294em] md:text-[34px] md:leading-[42px]">Activity</h1><p className="text-[16px] leading-6 text-[#4a4c55]">Who changed what, and when. Use it to check an action or find out how something got changed.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-[10px] border border-[#bdbcb5] bg-white px-3 focus-within:border-2 focus-within:border-[#002fa7]"><Search size={16} className="shrink-0 text-[#6e7079]" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by admin, action or name" aria-label="Search activity" className="w-full bg-transparent text-[14px] outline-none" /></label>
        <select aria-label="What changed" value={type} onChange={(event) => { setType(event.target.value); setPage(1); }} className="h-10 rounded-[10px] border border-[#bdbcb5] bg-white px-3 text-[14px]">{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      </div>
      {result.error && <p role="alert" className="rounded-[10px] bg-[#fdecea] px-4 py-3 text-[14px] text-[#8c1d13]">{result.error}</p>}
      <div className={cx('overflow-hidden rounded-[16px] border border-[#dcdbd5] bg-white transition-opacity', loading && 'opacity-60')}>
        {!rows.length ? <p className="px-6 py-14 text-center text-[15px] text-[#4a4c55]">{loading ? 'Loading…' : 'Nothing recorded yet. Changes admins make from now on appear here.'}</p> : (
          <ul>{rows.map((row) => (
            <li key={row._id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[#ecebe7] px-5 py-3.5 last:border-0">
              <span className="w-[120px] shrink-0 text-[13px] tabular-nums text-[#6e7079]">{stamp(row.createdAt)}</span>
              <span className="min-w-0 flex-1 text-[15px] leading-6"><span className="font-semibold">{row.actorName || 'An admin'}</span> <span className="text-[#4a4c55]">{row.label.charAt(0).toLowerCase() + row.label.slice(1)}</span>{row.targetName && (row.targetId && ['business', 'review', 'user'].includes(row.targetType) ? <> · <button type="button" onClick={() => open(row)} className="font-medium text-[#002fa7] hover:underline">{row.targetName}</button></> : <> · <span className="font-medium">{row.targetName}</span></>)}{row.details && <span className="block text-[13px] leading-5 text-[#6e7079]">{row.details}</span>}</span>
            </li>
          ))}</ul>
        )}
        {total > 30 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ecebe7] bg-[#f7f7f4] px-5 py-3 text-[14px] text-[#4a4c55]">
            <span>{(page - 1) * 30 + 1}–{Math.min(page * 30, total)} of {total}</span>
            <span className="flex items-center gap-2"><Button type="secondary" size="s" onClick={() => setPage(page - 1)} disabled={page === 1} icon={<ChevronLeft size={16} aria-hidden="true" />}>Newer</Button><span>Page {page} of {result.data?.pagination.totalPages}</span><Button type="secondary" size="s" onClick={() => setPage(page + 1)} disabled={!result.data || page >= result.data.pagination.totalPages} trailingIcon={<ChevronRight size={16} aria-hidden="true" />}>Older</Button></span>
          </div>
        )}
      </div>
    </main>
  );
};
