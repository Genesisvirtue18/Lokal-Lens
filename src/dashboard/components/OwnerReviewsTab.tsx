import { useConfirm } from '@/components/ConfirmProvider';
import React, { useMemo, useState } from 'react';
import { MessageSquareReply, Star, Trash2 } from 'lucide-react';
import { Button, cx } from '@/components/ds';
import { removeReviewReply, replyToReview } from '../api';
import ReportReviewButton from '@/components/ReportReviewButton';
import { BusinessListing, Review } from '../types';

interface Props {
  reviews: Review[];
  businesses: BusinessListing[];
  onReviewChange: (reviewId: string, reply: { text: string; createdAt: string } | null) => void;
  showToast: (message: string) => void;
}

const Stars = ({ value }: { value: number }) => <span className="inline-flex gap-0.5" role="img" aria-label={`${value} out of 5`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={16} className={n <= value ? 'fill-[#101115] text-[#101115]' : 'text-[#bdbcb5]'} aria-hidden="true" />)}</span>;
const date = (value?: string) => { try { return new Date(value || '').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };

export const OwnerReviewsTab: React.FC<Props> = ({ reviews, businesses, onReviewChange, showToast }) => {
  const confirm = useConfirm();
  const [filter, setFilter] = useState<'all' | 'open' | 'replied'>('all');
  const [business, setBusiness] = useState('');
  const [editing, setEditing] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const visible = useMemo(() => reviews.filter((review) => (!business || review.businessId === business) && (filter === 'all' || (filter === 'open' ? !review.reply : Boolean(review.reply)))), [reviews, filter, business]);
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const waiting = reviews.filter((review) => !review.reply).length;

  function startReply(review: Review) { setEditing(review.id); setText(review.reply || ''); setError(''); }
  async function post(review: Review) {
    const clean = text.trim();
    if (clean.length < 2) { setError('Write at least 2 characters.'); return; }
    if (/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/.test(clean) || /https?:\/\//i.test(clean)) { setError('Please don’t put phone numbers or links in a public reply.'); return; }
    setBusy(true); setError('');
    try { const reply = await replyToReview(review.businessId || '', review.id, clean); onReviewChange(review.id, reply); setEditing(''); showToast('Your reply is now public.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to post your reply.'); }
    finally { setBusy(false); }
  }
  async function remove(review: Review) {
    if (!(await confirm({ title: 'Remove your reply?', message: 'Customers will no longer see it. You can write a new one later.', confirmLabel: 'Remove reply', tone: 'warning' }))) return;
    try { await removeReviewReply(review.businessId || '', review.id); onReviewChange(review.id, null); showToast('Reply removed.'); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : 'Unable to remove the reply.'); }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 px-4 pb-24 pt-8 md:px-8 lg:pt-10">
      <div className="flex flex-col gap-2"><p className="font-eyebrow text-[#002fa7]">Reviews</p><h1 className="text-[28px] font-semibold leading-9 tracking-[-0.0294em] md:text-[34px] md:leading-[42px]">Customer reviews</h1><p className="text-[16px] leading-6 text-[#4a4c55]">Reply in public — a good reply shows future customers you care.</p></div>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Review summary">
        {[['Average rating', average ? average.toFixed(1) : '–'], ['Total reviews', String(reviews.length)], ['Waiting for your reply', String(waiting)]].map(([label, value]) => <div key={label} className="rounded-[16px] border border-[#dcdbd5] bg-white p-5"><p className="text-[28px] font-semibold leading-8 tracking-[-0.02em]">{value}</p><p className="text-[14px] leading-5 text-[#4a4c55]">{label}</p></div>)}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        {([['all', 'All'], ['open', `Needs reply (${waiting})`], ['replied', 'Replied']] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setFilter(id)} aria-pressed={filter === id} className={cx('inline-flex h-10 items-center rounded-full border px-4 font-display text-[14px] font-medium', filter === id ? 'border-[#002fa7] bg-[#e6ebf7] text-[#002fa7]' : 'border-[#dcdbd5] bg-white hover:border-[#101115]')}>{label}</button>)}
        {businesses.length > 1 && <select aria-label="Filter by listing" value={business} onChange={(event) => setBusiness(event.target.value)} className="ml-auto h-10 rounded-[10px] border border-[#bdbcb5] bg-white px-3 text-[14px]"><option value="">All listings</option>{businesses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-[#bdbcb5] bg-white px-6 py-14 text-center"><p className="text-[16px] font-medium">{reviews.length ? 'Nothing here with this filter.' : 'No reviews yet'}</p><p className="mt-1 text-[14px] text-[#4a4c55]">{reviews.length ? 'Try “All”.' : 'Once customers review your live listing, you can reply here.'}</p></div>
      ) : (
        <ul className="flex flex-col gap-4">
          {visible.map((review) => (
            <li key={review.id} className="flex flex-col gap-3 rounded-[16px] border border-[#dcdbd5] bg-white p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fbe6ec] font-display text-[15px] font-semibold text-[#7a2842]">{(review.author || '?')[0].toUpperCase()}</span>
                <div className="min-w-0 flex-1"><p className="truncate font-display text-[15px] font-semibold leading-5">{review.author}</p><p className="truncate text-[13px] leading-[18px] text-[#6e7079]">{date(review.createdAt)}{businesses.length > 1 ? ` · ${review.businessName}` : ''}</p></div>
                <Stars value={review.rating} />
              </div>
              {review.comment ? <p className="whitespace-pre-line text-[16px] leading-6">{review.comment}</p> : <p className="text-[14px] italic text-[#6e7079]">Rated without a comment.</p>}

              {editing === review.id ? (
                <div className="flex flex-col gap-2 rounded-[12px] bg-[#f7f9fd] p-4">
                  <label htmlFor={`reply-${review.id}`} className="font-display text-[14px] font-medium">Your public reply</label>
                  <textarea id={`reply-${review.id}`} autoFocus value={text} onChange={(event) => { setText(event.target.value.slice(0, 1000)); setError(''); }} rows={3} placeholder="Thank them, answer their point, invite them back." className="w-full rounded-[10px] border border-[#bdbcb5] bg-white px-3.5 py-3 text-[16px] leading-6 outline-none focus:border-2 focus:border-[#002fa7] focus:px-[13px]" />
                  <div className="flex justify-between text-[13px] text-[#6e7079]"><span role={error ? 'alert' : undefined} className={error ? 'text-[#b42318]' : ''}>{error || 'Replies are public. Keep them polite and don’t add phone numbers.'}</span><span>{text.length} / 1000</span></div>
                  <div className="flex gap-2"><Button type="primary" size="s" onClick={() => post(review)} disabled={busy}>{busy ? 'Posting…' : 'Post reply'}</Button><Button type="ghost" size="s" onClick={() => setEditing('')}>Cancel</Button></div>
                </div>
              ) : review.reply ? (
                <div className="rounded-[12px] bg-[#f1f1ee] p-4">
                  <p className="font-display text-[13px] font-semibold text-[#002fa7]">Your reply · {date(review.replyDate)}</p>
                  <p className="mt-1 whitespace-pre-line text-[15px] leading-6">{review.reply}</p>
                  <div className="mt-2 flex gap-3 text-[13px] font-medium"><button type="button" onClick={() => startReply(review)} className="text-[#002fa7] hover:underline">Edit</button><button type="button" onClick={() => remove(review)} className="inline-flex items-center gap-1 text-[#b42318] hover:underline"><Trash2 size={14} aria-hidden="true" />Remove</button></div>
                </div>
              ) : (
                <div><Button type="secondary" size="s" onClick={() => startReply(review)} icon={<MessageSquareReply size={18} aria-hidden="true" />}>Reply</Button></div>
              )}
              <div className="flex justify-end border-t border-[#ecebe7] pt-2"><ReportReviewButton businessId={review.businessId || ''} reviewId={review.id} /></div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
};
