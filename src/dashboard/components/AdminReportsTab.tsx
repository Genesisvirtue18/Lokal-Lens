import React, { useEffect, useState } from 'react';
import { ExternalLink, FileText, Star } from 'lucide-react';
import { Badge, Button, cx } from '@/components/ds';
import { useConfirm } from '@/components/ConfirmProvider';
import { AdminClaim, AdminReport, decideAdminClaim, loadAdminClaims, loadAdminReports, resolveAdminReport } from '../api';

const REASON: Record<string, string> = { spam: 'Spam', fake: 'Fake review', abusive: 'Abusive or hateful', irrelevant: 'Not about this business', personal_info: 'Shares personal information', other: 'Other' };
const RELATION: Record<string, string> = { owner: 'The owner', manager: 'A manager', employee: 'An employee', agency: 'An agency working for them', other: 'Someone else' };
const when = (value?: string) => (value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

type Segment = 'reports' | 'claims';

export const AdminReportsTab: React.FC<{ openReports: number; pendingClaims: number; onChanged: () => void; onOpenBusiness: (id: string) => void; onOpenPerson: (id: string) => void; showToast: (message: string) => void }> = ({ openReports, pendingClaims, onChanged, onOpenBusiness, onOpenPerson, showToast }) => {
  const [segment, setSegment] = useState<Segment>(pendingClaims > openReports ? 'claims' : 'reports');
  const [view, setView] = useState('open');
  const [version, setVersion] = useState(0);
  const [reports, setReports] = useState<{ key: string; items?: AdminReport[]; error?: string }>({ key: '' });
  const [claims, setClaims] = useState<{ key: string; items?: AdminClaim[]; error?: string }>({ key: '' });
  const key = `${segment}-${view}-${version}`;

  useEffect(() => {
    let live = true;
    if (segment === 'reports') loadAdminReports({ status: view === 'open' ? 'open' : 'all', limit: 50 }).then((data) => { if (live) setReports({ key, items: data.items }); }).catch((reason) => { if (live) setReports({ key, error: reason instanceof Error ? reason.message : 'Unable to load reports' }); });
    else loadAdminClaims({ status: view === 'open' ? 'pending' : 'all', limit: 50 }).then((data) => { if (live) setClaims({ key, items: data.items }); }).catch((reason) => { if (live) setClaims({ key, error: reason instanceof Error ? reason.message : 'Unable to load claims' }); });
    return () => { live = false; };
  }, [key, segment, view]);
  const refresh = () => { setVersion((value) => value + 1); onChanged(); };
  const loading = (segment === 'reports' ? reports.key : claims.key) !== key;

  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 pb-24 pt-8 md:px-8 lg:pt-10">
      <div className="flex flex-col gap-2"><p className="font-eyebrow text-[#002fa7]">Admin</p><h1 className="text-[28px] font-semibold leading-9 tracking-[-0.0294em] md:text-[34px] md:leading-[42px]">Reports and claims</h1><p className="text-[16px] leading-6 text-[#4a4c55]">Reviews people flagged, and requests from owners who say a listing is theirs.</p></div>

      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Type" className="flex rounded-[10px] border border-[#bdbcb5] bg-white p-1">
          {([['reports', 'Reported reviews', openReports], ['claims', 'Listing claims', pendingClaims]] as const).map(([id, label, count]) => <button key={id} type="button" role="tab" aria-selected={segment === id} onClick={() => setSegment(id)} className={cx('inline-flex h-8 items-center gap-2 rounded-[8px] px-3 font-display text-[14px] font-medium', segment === id ? 'bg-[#002fa7] text-white' : 'text-[#4a4c55] hover:bg-[#f1f1ee]')}>{label}{count > 0 && <span className={cx('grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[12px] font-semibold', segment === id ? 'bg-white/20 text-white' : 'bg-[#002fa7] text-white')}>{count}</span>}</button>)}
        </div>
        <select aria-label="Show" value={view} onChange={(event) => setView(event.target.value)} className="h-10 rounded-[10px] border border-[#bdbcb5] bg-white px-3 text-[14px]"><option value="open">Needs a decision</option><option value="all">Everything, including decided</option></select>
      </div>

      {segment === 'reports' ? (
        <section className={cx('flex flex-col gap-3 transition-opacity', loading && 'opacity-60')} aria-label="Reported reviews">
          {reports.error && <p role="alert" className="rounded-[10px] bg-[#fdecea] px-4 py-3 text-[14px] text-[#8c1d13]">{reports.error}</p>}
          {!loading && !reports.items?.length && <p className="rounded-[16px] border border-dashed border-[#bdbcb5] bg-white px-6 py-12 text-center text-[15px] text-[#4a4c55]">{view === 'open' ? 'No reported reviews waiting. Nice.' : 'No reports yet.'}</p>}
          {reports.items?.map((report) => <ReportCard key={report._id} report={report} onDone={refresh} onOpenBusiness={onOpenBusiness} onOpenPerson={onOpenPerson} showToast={showToast} />)}
        </section>
      ) : (
        <section className={cx('flex flex-col gap-3 transition-opacity', loading && 'opacity-60')} aria-label="Listing claims">
          {claims.error && <p role="alert" className="rounded-[10px] bg-[#fdecea] px-4 py-3 text-[14px] text-[#8c1d13]">{claims.error}</p>}
          {!loading && !claims.items?.length && <p className="rounded-[16px] border border-dashed border-[#bdbcb5] bg-white px-6 py-12 text-center text-[15px] text-[#4a4c55]">{view === 'open' ? 'No claims waiting.' : 'No claims yet.'}</p>}
          {claims.items?.map((claim) => <ClaimCard key={claim._id} claim={claim} onDone={refresh} onOpenBusiness={onOpenBusiness} onOpenPerson={onOpenPerson} showToast={showToast} />)}
        </section>
      )}
    </main>
  );
};

function ReportCard({ report, onDone, onOpenBusiness, onOpenPerson, showToast }: { report: AdminReport; onDone: () => void; onOpenBusiness: (id: string) => void; onOpenPerson: (id: string) => void; showToast: (message: string) => void }) {
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();
  const review = report.currentReview || report.snapshot;
  const act = async (action: 'dismiss' | 'remove') => {
    if (action === 'remove' && !(await confirm({ title: 'Remove this review?', message: 'It is deleted from the listing and the rating is recalculated. The reviewer is not emailed.', confirmLabel: 'Remove review', tone: 'danger' }))) return;
    setBusy(true);
    try { await resolveAdminReport(report._id, action); showToast(action === 'remove' ? 'Review removed.' : 'Report dismissed.'); onDone(); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : 'That didn’t work'); setBusy(false); }
  };
  return (
    <article className="flex flex-col gap-3 rounded-[16px] border border-[#dcdbd5] bg-white p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Badge tone={report.status === 'open' ? 'pending' : 'closed'}>{report.status === 'open' ? 'Open' : report.status === 'removed' ? 'Review removed' : 'Dismissed'}</Badge>
        <span className="font-display text-[15px] font-semibold">{REASON[report.reason] || report.reason}</span>
        <span className="text-[13px] text-[#6e7079]">reported {when(report.createdAt)} by {report.reporter ? <button type="button" onClick={() => onOpenPerson(report.reporter!._id)} className="hover:text-[#002fa7] hover:underline">{report.reporter.name}</button> : 'someone'}{report.reporterRole === 'business_owner' ? ' (the business owner)' : ''}</span>
        {report.business && <button type="button" onClick={() => onOpenBusiness(report.business!._id)} className="ml-auto text-[14px] font-medium text-[#002fa7] hover:underline">{report.business.name}</button>}
      </div>
      {report.note && <p className="rounded-[10px] bg-[#fbf0d9] px-3 py-2 text-[14px] leading-5 text-[#5c3d00]"><span className="font-semibold">Their note:</span> {report.note}</p>}
      {review ? (
        <div className="rounded-[12px] border border-[#ecebe7] bg-[#f7f7f4] p-4">
          <div className="flex items-center gap-2 text-[14px]"><span className="inline-flex gap-0.5">{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={14} className={value <= (review.rating || 0) ? 'fill-[#002fa7] text-[#002fa7]' : 'text-[#bdbcb5]'} aria-hidden="true" />)}</span><span className="font-semibold">{review.reviewerName}</span>{!report.currentReview && <span className="text-[#6e7079]">· already removed</span>}</div>
          <p className="mt-1.5 text-[15px] leading-6">{review.comment || <span className="text-[#6e7079]">No written comment.</span>}</p>
        </div>
      ) : null}
      {report.status === 'open' && <div className="flex flex-wrap gap-2"><Button type="primary" size="s" onClick={() => void act('remove')} disabled={busy || !report.currentReview}>Remove review</Button><Button type="secondary" size="s" onClick={() => void act('dismiss')} disabled={busy}>Keep it, dismiss report</Button></div>}
    </article>
  );
}

function ClaimCard({ claim, onDone, onOpenBusiness, onOpenPerson, showToast }: { claim: AdminClaim; onDone: () => void; onOpenBusiness: (id: string) => void; onOpenPerson: (id: string) => void; showToast: (message: string) => void }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();
  const business = claim.business;
  const decide = async (decision: 'approve' | 'reject') => {
    const pw = decision === 'approve' ? await confirm({ title: `Hand “${business?.name}” to ${claim.claimant?.name}?`, message: `${business?.owner ? `It moves away from ${business.owner.name}. ` : ''}The new owner gets full control of the listing. Both are told by email.`, confirmLabel: 'Approve and hand over', tone: 'warning', askCode: true }) : true;
    if (!pw) return;
    setBusy(true);
    try { await decideAdminClaim(claim._id, decision, note.trim() || undefined, typeof pw === 'string' ? pw : undefined); showToast(decision === 'approve' ? 'Claim approved. The listing was handed over.' : 'Claim rejected.'); onDone(); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : 'That didn’t work'); setBusy(false); }
  };
  return (
    <article className="flex flex-col gap-3 rounded-[16px] border border-[#dcdbd5] bg-white p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Badge tone={claim.status === 'pending' ? 'pending' : claim.status === 'approved' ? 'live' : 'closed'}>{claim.status === 'pending' ? 'Waiting' : claim.status === 'approved' ? 'Approved' : 'Rejected'}</Badge>
        {business && <button type="button" onClick={() => onOpenBusiness(business._id)} className="font-display text-[16px] font-semibold hover:text-[#002fa7] hover:underline">{business.name}</button>}
        <span className="text-[13px] text-[#6e7079]">{[business?.address?.city, business?.address?.state].filter(Boolean).join(', ')} · sent {when(claim.createdAt)}</span>
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-[14px] leading-5 sm:grid-cols-2">
        <div><dt className="text-[#6e7079]">Claimed by</dt><dd className="font-medium">{claim.claimant ? <button type="button" onClick={() => onOpenPerson(claim.claimant!._id)} className="hover:text-[#002fa7] hover:underline">{claim.claimant.name}</button> : 'Unknown'}{claim.claimant?.email && <span className="ml-1 font-normal text-[#4a4c55]">· {claim.claimant.email}{claim.claimant.emailVerified ? ' (confirmed)' : ''}</span>}</dd></div>
        <div><dt className="text-[#6e7079]">Says they are</dt><dd className="font-medium">{RELATION[claim.relationship] || claim.relationship}{claim.phone && <span className="ml-1 font-normal text-[#4a4c55]">· {claim.phone}</span>}</dd></div>
        <div><dt className="text-[#6e7079]">Listing’s own contact</dt><dd>{[business?.phone, business?.email].filter(Boolean).join(' · ') || 'None on the listing'}</dd></div>
        <div><dt className="text-[#6e7079]">Currently managed by</dt><dd>{business?.owner ? `${business.owner.name}${business.owner.email ? ` · ${business.owner.email}` : ''}` : <span className="font-medium text-[#8a5a00]">No one</span>}</dd></div>
      </dl>
      <div className="flex flex-wrap gap-2">
        {claim.verifiedVia === 'listing_email' && <Badge tone="verified">Verified: code sent to the listing’s email</Badge>}
        {claim.verifiedVia === 'website_domain' && <Badge tone="verified">Verified: email on the business’s own domain</Badge>}
        {(!claim.verifiedVia || claim.verifiedVia === 'none') && <Badge tone="pending">No automatic proof, check the document</Badge>}
        {claim.autoApproved && <Badge tone="live">Approved automatically</Badge>}
        {claim.ownerNotifiedAt && <Badge tone="pending">Current owner was told</Badge>}
      </div>
      {claim.ownerDispute && <p className="rounded-[10px] border border-[#f1c9c4] bg-[#fff6f5] px-4 py-3 text-[14px] leading-5 text-[#8c1d13]"><span className="font-semibold">The current owner disputes this:</span> {claim.ownerDispute}</p>}
      <p className="whitespace-pre-line rounded-[10px] bg-[#f7f7f4] px-4 py-3 text-[15px] leading-6">{claim.message}</p>
      {claim.documentUrl && <a href={claim.documentUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 text-[14px] font-medium text-[#002fa7] hover:underline"><FileText size={16} aria-hidden="true" />View the proof they uploaded<ExternalLink size={13} aria-hidden="true" /></a>}
      {claim.decisionNote && claim.status !== 'pending' && <p className="text-[14px] text-[#4a4c55]"><span className="font-semibold">Decision note:</span> {claim.decisionNote}</p>}
      {claim.status === 'pending' && (
        <div className="flex flex-col gap-2 border-t border-[#ecebe7] pt-3">
          <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={600} placeholder="Note for the claimant (optional, sent by email)" aria-label="Note for the claimant" className="h-10 rounded-[10px] border border-[#bdbcb5] px-3 text-[14px] outline-none focus:border-2 focus:border-[#002fa7]" />
          <div className="flex flex-wrap gap-2"><Button type="primary" size="s" onClick={() => void decide('approve')} disabled={busy}>Approve and hand over</Button><Button type="secondary" size="s" onClick={() => void decide('reject')} disabled={busy}>Reject</Button></div>
        </div>
      )}
    </article>
  );
}
