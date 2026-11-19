import React, { useEffect, useState } from 'react';
import { Badge, Button, cx } from '@/components/ds';
import { useConfirm } from '@/components/ConfirmProvider';
import { AdminListingReport, loadAdminListingReports, decideAdminListingReport } from '../api';

const REASON: Record<string, string> = { wrong_info: 'Wrong information', closed: 'Business is closed', duplicate: 'Duplicate listing', spam: 'Spam or fake', other: 'Other' };
const when = (value?: string) => (value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

// "Reported listings": people tell us a listing is wrong, closed, a duplicate or spam. The admin dismisses it, marks it handled, or suspends the listing.
export const AdminListingReports: React.FC<{ view: string; version: number; onDone: () => void; onOpenBusiness: (id: string) => void; onOpenPerson: (id: string) => void; showToast: (message: string) => void }> = ({ view, version, onDone, onOpenBusiness, onOpenPerson, showToast }) => {
  const confirm = useConfirm();
  const key = `${view}-${version}`;
  const [state, setState] = useState<{ key: string; items?: AdminListingReport[]; error?: string }>({ key: '' });
  const [busy, setBusy] = useState('');
  useEffect(() => {
    let live = true;
    loadAdminListingReports({ status: view === 'open' ? 'open' : 'all', limit: 50 }).then((data) => { if (live) setState({ key, items: data.items }); }).catch((reason) => { if (live) setState({ key, error: reason instanceof Error ? reason.message : 'Unable to load reports' }); });
    return () => { live = false; };
  }, [key, view]);
  const loading = state.key !== key;

  const decide = async (report: AdminListingReport, action: 'dismiss' | 'resolve' | 'suspend') => {
    if (action === 'suspend' && !(await confirm({ title: `Suspend “${report.business?.name}”?`, message: 'It disappears from search and its page stops working until you restore it from Businesses. Other open reports on it are closed too. The owner is told by email.', confirmLabel: 'Suspend listing', tone: 'warning' }))) return;
    setBusy(report._id);
    try { await decideAdminListingReport(report._id, action); showToast(action === 'suspend' ? 'Listing suspended.' : action === 'dismiss' ? 'Report dismissed.' : 'Marked as handled.'); onDone(); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Unable to save that'); }
    finally { setBusy(''); }
  };

  return (
    <section className={cx('flex flex-col gap-3 transition-opacity', loading && 'opacity-60')} aria-label="Reported listings">
      {state.error && <p role="alert" className="rounded-[10px] bg-[#fdecea] px-4 py-3 text-[14px] text-[#8c1d13]">{state.error}</p>}
      {!loading && !state.items?.length && <p className="rounded-[16px] border border-dashed border-[#bdbcb5] bg-white px-6 py-12 text-center text-[15px] text-[#4a4c55]">{view === 'open' ? 'No reported listings waiting. Nice.' : 'No listing reports yet.'}</p>}
      {state.items?.map((report) => (
        <article key={report._id} className="flex flex-col gap-3 rounded-[16px] border border-[#dcdbd5] bg-white p-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Badge tone={report.status === 'open' ? 'pending' : report.status === 'resolved' ? 'live' : 'closed'}>{report.status === 'open' ? 'Waiting' : report.status === 'resolved' ? 'Handled' : 'Dismissed'}</Badge>
            {report.business && <button type="button" onClick={() => onOpenBusiness(report.business!._id)} className="font-display text-[16px] font-semibold hover:text-[#002fa7] hover:underline">{report.business.name}</button>}
            <span className="text-[13px] text-[#6e7079]">{[report.business?.address?.city, report.business?.listingStatus === 'published' ? 'Live' : report.business?.listingStatus].filter(Boolean).join(' · ')} · reported {when(report.createdAt)}</span>
            {report.openOnListing > 1 && report.status === 'open' && <Badge tone="pending">{report.openOnListing} open reports on this listing</Badge>}
          </div>
          <dl className="grid gap-x-6 gap-y-2 text-[14px] leading-5 sm:grid-cols-2">
            <div><dt className="text-[#6e7079]">Reason</dt><dd className="font-medium">{REASON[report.reason] || report.reason}</dd></div>
            <div><dt className="text-[#6e7079]">Reported by</dt><dd className="font-medium">{report.reporter ? <button type="button" onClick={() => onOpenPerson(report.reporter!._id)} className="hover:text-[#002fa7] hover:underline">{report.reporter.name}</button> : 'Deleted account'}</dd></div>
            <div><dt className="text-[#6e7079]">Listing owner</dt><dd>{report.business?.owner ? `${report.business.owner.name}${report.business.owner.email ? ` · ${report.business.owner.email}` : ''}` : 'No owner'}</dd></div>
            <div><dt className="text-[#6e7079]">Listing phone</dt><dd>{report.business?.phone || '—'}</dd></div>
          </dl>
          {report.note && <p className="whitespace-pre-line rounded-[10px] bg-[#f7f7f4] px-4 py-3 text-[15px] leading-6">{report.note}</p>}
          {report.decisionNote && report.status !== 'open' && <p className="text-[14px] text-[#4a4c55]"><span className="font-semibold">Decision note:</span> {report.decisionNote}</p>}
          {report.status === 'open' && (
            <div className="flex flex-wrap gap-2">
              <Button type="secondary" size="s" disabled={busy === report._id} onClick={() => void decide(report, 'suspend')}>Suspend listing</Button>
              <Button type="secondary" size="s" disabled={busy === report._id} onClick={() => void decide(report, 'resolve')}>Mark as handled</Button>
              <Button type="ghost" size="s" disabled={busy === report._id} onClick={() => void decide(report, 'dismiss')}>Dismiss</Button>
            </div>
          )}
        </article>
      ))}
    </section>
  );
};
