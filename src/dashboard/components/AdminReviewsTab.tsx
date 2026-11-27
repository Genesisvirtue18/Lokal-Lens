import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Star, Trash2 } from 'lucide-react';
import { Button, cx } from '@/components/ds';
import { useConfirm } from '@/components/ConfirmProvider';
import { AdminReview, deleteAdminReview, loadAdminReviews, Paged } from '../api';

const field = 'h-10 rounded-[10px] border border-[#bdbcb5] bg-white px-3 text-[14px] outline-none focus:border-2 focus:border-[#002fa7]';
const when = (value?: string) => (value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export const AdminReviewsTab: React.FC<{ onOpenBusiness: (id: string) => void; onOpenPerson: (id: string) => void; showToast: (message: string) => void }> = ({ onOpenBusiness, onOpenPerson, showToast }) => {
  const [rating, setRating] = useState('all');
  const [replied, setReplied] = useState('all');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const confirm = useConfirm();
  const [result, setResult] = useState<{ key: string; data?: Paged<AdminReview>; error?: string }>({ key: '' });

  useEffect(() => { const timer = setTimeout(() => { setTerm(search.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);
  const key = JSON.stringify([rating, replied, term, page, version]);
  useEffect(() => {
    let live = true;
    loadAdminReviews({ rating, replied, search: term, page, limit: 20 }).then((data) => { if (live) setResult({ key, data }); }).catch((reason) => { if (live) setResult({ key, error: reason instanceof Error ? reason.message : 'Unable to load reviews' }); });
    return () => { live = false; };
  }, [key, rating, replied, term, page]);
  const loading = result.key !== key;
  const rows = result.data?.items || [];
  const total = result.data?.pagination.totalItems || 0;

  const remove = async (review: AdminReview) => {
    if (!(await confirm({ title: `Delete this ${review.rating}-star review?`, message: `By ${review.reviewerName} on ${review.businessName}. The business’s rating is recalculated. This can’t be undone.`, confirmLabel: 'Delete review', tone: 'danger' }))) return;
    try { await deleteAdminReview(review.businessId, review.id); setVersion((value) => value + 1); showToast('Review deleted.'); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : 'Unable to delete the review'); }
  };

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 pb-24 pt-8 md:px-8 lg:pt-10">
      <div className="flex flex-col gap-2"><p className="font-eyebrow text-[#002fa7]">Admin</p><h1 className="text-[28px] font-semibold leading-9 tracking-[-0.0294em] md:text-[34px] md:leading-[42px]">Reviews</h1><p className="text-[16px] leading-6 text-[#4a4c55]">Every review on the platform: who wrote it, for which business, and what the owner replied. Remove reviews that break the rules.</p></div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-[10px] border border-[#bdbcb5] bg-white px-3 focus-within:border-2 focus-within:border-[#002fa7]"><Search size={16} className="shrink-0 text-[#6e7079]" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reviewer, comment or business" aria-label="Search reviews" className="w-full bg-transparent text-[14px] outline-none" /></label>
        <select aria-label="Rating" value={rating} onChange={(event) => { setRating(event.target.value); setPage(1); }} className={field}><option value="all">Any rating</option>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} star{value === 1 ? '' : 's'}</option>)}</select>
        <select aria-label="Owner reply" value={replied} onChange={(event) => { setReplied(event.target.value); setPage(1); }} className={field}><option value="all">Replied or not</option><option value="no">Not replied</option><option value="yes">Replied</option></select>
      </div>

      {result.error && <p role="alert" className="rounded-[10px] bg-[#fdecea] px-4 py-3 text-[14px] text-[#8c1d13]">{result.error}</p>}

      <div className={cx('overflow-hidden rounded-[16px] border border-[#dcdbd5] bg-white transition-opacity', loading && 'opacity-60')}>
        {!rows.length ? <p className="px-6 py-14 text-center text-[15px] text-[#4a4c55]">{loading ? 'Loading…' : total === 0 && rating === 'all' && replied === 'all' && !term ? 'No reviews on the platform yet.' : 'No reviews match these filters.'}</p> : (
          <ul>{rows.map((review) => (
            <li key={`${review.businessId}-${review.id}`} className="flex flex-col gap-2 border-b border-[#ecebe7] px-5 py-4 last:border-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-0.5" aria-label={`${review.rating} out of 5`}>{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={16} className={value <= review.rating ? 'fill-[#002fa7] text-[#002fa7]' : 'text-[#bdbcb5]'} aria-hidden="true" />)}</span>
                {review.reviewerId ? <button type="button" onClick={() => onOpenPerson(review.reviewerId as string)} className="font-display text-[15px] font-semibold hover:text-[#002fa7] hover:underline">{review.reviewerName}</button> : <span className="font-display text-[15px] font-semibold">{review.reviewerName}</span>}
                <span className={cx('rounded-full px-2 py-0.5 text-[12px] font-medium', review.source === 'member' ? 'bg-[#e6ebf7] text-[#002fa7]' : 'bg-[#f1f1ee] text-[#4a4c55]')}>{review.source === 'member' ? 'Member' : 'Imported'}</span>
                {review.reviewerEmail && <span className="text-[13px] text-[#6e7079]">{review.reviewerEmail}</span>}
                <span className="text-[13px] text-[#6e7079]">· {when(review.createdAt)}</span>
                <button type="button" onClick={() => onOpenBusiness(review.businessId)} className="ml-auto truncate text-[14px] font-medium text-[#002fa7] hover:underline">{review.businessName}</button>
              </div>
              {review.comment ? <p className="text-[15px] leading-6 text-[#2f3138]">{review.comment}</p> : <p className="text-[14px] text-[#6e7079]">No written comment.</p>}
              {(review as { photos?: string[] }).photos?.length ? <div className="flex flex-wrap gap-2">{(review as { photos?: string[] }).photos!.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" className="block h-16 w-16 overflow-hidden rounded-[8px] border border-[#dcdbd5]"><Image src={url} alt="Review photo" width={64} height={64} unoptimized className="h-full w-full object-cover" /></a>)}</div> : null}
              {review.reply && <p className="rounded-[10px] bg-[#f7f7f4] px-3 py-2 text-[14px] leading-5 text-[#4a4c55]"><span className="font-semibold">Owner replied:</span> {review.reply}</p>}
              <div className="flex justify-end"><button type="button" onClick={() => void remove(review)} className="inline-flex h-9 items-center gap-1.5 rounded-[8px] px-2.5 font-display text-[14px] font-medium text-[#b42318] hover:bg-[#fdecea]"><Trash2 size={16} aria-hidden="true" />Delete review</button></div>
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
