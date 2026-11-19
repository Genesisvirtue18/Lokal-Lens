import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { BadgeCheck, ChevronLeft, ChevronRight, Download, ExternalLink, Pencil, Plus, Search, ShieldCheck, Store, Trash2, Upload, X } from 'lucide-react';
import { Badge, Button, cx } from '@/components/ds';
import { businessDetailPath } from '@/lib/directory-data';
import { assignBusinessOwner, bulkListingsAction, deleteAdminBusiness, downloadAdminExport, importBusinessesCsv, loadAdminOwners, reviewKyc, setAdminBusinessStatus, setBusinessPlan } from '../api';
import { BusinessListing } from '../types';
import { useConfirm } from '@/components/ConfirmProvider';
import { AdminListingDetails } from './AdminListingDetails';

interface AdminBusinessesTabProps {
  activeBusinesses: BusinessListing[];
  pendingBusinesses: BusinessListing[];
  onApproveBusiness: (id: string) => void;
  onRejectBusiness: (id: string, reason?: string) => void;
  onClearGooglePlaceMismatch: (id: string) => void;
  onBusinessesImported: (businesses: BusinessListing[]) => void;
  onBusinessUpdated: (business: BusinessListing) => void;
  onBusinessRemoved: (id: string) => void;
  onReload?: () => void;
  onToast?: (message: string) => void;
  onCreate: () => void;
  onEdit: (business: BusinessListing) => void;
  openId?: string;
  onClose?: () => void;
}

const PAGE_SIZE = 20;
const STATUS_LABEL: Record<BusinessListing['status'], string> = { Active: 'Live', Pending: 'In review', Rejected: 'Rejected', Draft: 'Draft', Suspended: 'Suspended', Paused: 'Paused by owner' };
const STATUS_FILTERS: { value: string; label: string }[] = [{ value: 'all', label: 'All statuses' }, { value: 'Pending', label: 'In review' }, { value: 'Active', label: 'Live' }, { value: 'Draft', label: 'Draft' }, { value: 'Paused', label: 'Paused' }, { value: 'Suspended', label: 'Suspended' }, { value: 'Rejected', label: 'Rejected' }];

const publicPath = (business: BusinessListing) => businessDetailPath({ address: business.address, slug: business.slug, name: business.name, id: business.id });
const fieldBase = 'h-10 rounded-[10px] border border-[#bdbcb5] bg-white px-3 text-[14px] outline-none focus:border-2 focus:border-[#002fa7]';

function StatusBadge({ status }: { status: BusinessListing['status'] }) {
  const tone = status === 'Active' ? 'live' : status === 'Pending' || status === 'Paused' ? 'pending' : 'closed';
  return <Badge tone={tone}>{STATUS_LABEL[status]}</Badge>;
}

function VerificationBadge({ business }: { business: BusinessListing }) {
  if (business.verified || business.kycStatus === 'verified') return <Badge tone="verified">Verified</Badge>;
  if (business.kycStatus === 'submitted') return <span className="inline-flex items-center rounded-full bg-[#fbf0d9] px-2.5 py-1 font-display text-[13px] font-medium text-[#8a5a00]">To check</span>;
  if (business.kycStatus === 'rejected') return <span className="inline-flex items-center rounded-full bg-[#fce9e7] px-2.5 py-1 font-display text-[13px] font-medium text-[#b42318]">Rejected</span>;
  return <span className="text-[13px] text-[#6e7079]">Not verified</span>;
}

export const AdminBusinessesTab: React.FC<AdminBusinessesTabProps> = ({ activeBusinesses, pendingBusinesses, onApproveBusiness, onRejectBusiness, onClearGooglePlaceMismatch, onBusinessesImported, onBusinessUpdated, onBusinessRemoved, onReload, onToast, onCreate, onEdit, openId, onClose }) => {
  const all = useMemo(() => [...pendingBusinesses, ...activeBusinesses], [pendingBusinesses, activeBusinesses]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [verification, setVerification] = useState('all');
  const [owner, setOwner] = useState('all');
  const [page, setPage] = useState(1);
  const [pickedId, setSelectedId] = useState('');
  const selectedId = pickedId || openId || '';
  const [showImport, setShowImport] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const confirm = useConfirm();
  const [ownerChoices, setOwnerChoices] = useState<{ id: string; name: string; email: string }[]>([]);
  useEffect(() => { if (checked.length > 0 && ownerChoices.length === 0) void loadAdminOwners().then(setOwnerChoices).catch(() => {}); }, [checked.length, ownerChoices.length]);
  const assignChecked = async (ownerId: string) => {
    const owner = ownerChoices.find((item) => item.id === ownerId);
    const pw = owner ? await confirm({ title: `Give ${checked.length} listing${checked.length === 1 ? '' : 's'} to ${owner.name}?`, message: 'They replace the current owner of each listing. The new owner can edit them straight away.', confirmLabel: 'Assign', tone: 'warning', askCode: true }) : false;
    if (!owner || !pw) return;
    setBulkBusy(true);
    try { const done = await bulkListingsAction(checked, 'assign', ownerId, String(pw)); onToast?.(`${done.count} listing${done.count === 1 ? '' : 's'} assigned to ${owner.name}.`); setChecked([]); onReload?.(); }
    catch (reason) { onToast?.(reason instanceof Error ? reason.message : 'That didn’t work'); }
    finally { setBulkBusy(false); }
  };
  const runBulk = async (action: 'suspend' | 'restore' | 'delete') => {
    const n = checked.length;
    const label = `${n} listing${n === 1 ? '' : 's'}`;
    const ok = action === 'delete' ? await confirm({ title: `Delete ${label}?`, message: 'They disappear from the site and from their owners’ dashboards. There is no undo in the app.', confirmLabel: `Delete ${label}`, tone: 'danger', requireText: 'DELETE', askCode: true })
      : action === 'suspend' ? await confirm({ title: `Suspend ${label}?`, message: 'Live and paused listings are hidden from search until you restore them. Their owners are not emailed.', confirmLabel: 'Suspend', tone: 'warning' })
        : await confirm({ title: `Restore ${label}?`, message: 'Suspended listings go live again.', confirmLabel: 'Restore', tone: 'primary' });
    if (!ok) return;
    setBulkBusy(true);
    try { const done = await bulkListingsAction(checked, action, undefined, typeof ok === 'string' ? ok : undefined); onToast?.(`${done.count} listing${done.count === 1 ? '' : 's'} ${action === 'suspend' ? 'suspended' : action === 'restore' ? 'restored' : 'deleted'}.`); setChecked([]); onReload?.(); }
    catch (reason) { onToast?.(reason instanceof Error ? reason.message : 'That didn’t work'); }
    finally { setBulkBusy(false); }
  };


  const categories = useMemo(() => [...new Set(all.map((item) => item.category))].sort(), [all]);
  const term = search.trim().toLowerCase();
  const filtered = useMemo(() => all.filter((item) => {
    if (status !== 'all' && item.status !== status) return false;
    if (category !== 'all' && item.category !== category) return false;
    if (owner === 'none' && item.ownerId) return false;
    if (verification === 'verified' && !(item.verified || item.kycStatus === 'verified')) return false;
    if (verification === 'check' && item.kycStatus !== 'submitted') return false;
    if (verification === 'unverified' && (item.verified || item.kycStatus === 'verified')) return false;
    if (term && ![item.name, item.owner, item.location, item.phone, item.email || ''].some((value) => String(value || '').toLowerCase().includes(term))) return false;
    return true;
  }), [all, status, category, owner, verification, term]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const selected = all.find((item) => item.id === selectedId) || null;
  const counts = { review: all.filter((item) => item.status === 'Pending').length, live: all.filter((item) => item.status === 'Active').length, check: all.filter((item) => item.kycStatus === 'submitted').length, unowned: all.filter((item) => !item.ownerId).length };
  const reset = (setter: (value: string) => void) => (value: string) => { setter(value); setPage(1); };
  const close = () => { setSelectedId(''); onClose?.(); };

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 pb-24 pt-8 md:px-8 lg:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-eyebrow text-[#002fa7]">Admin</p>
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.0294em] md:text-[34px] md:leading-[42px]">Businesses</h1>
          <p className="text-[16px] leading-6 text-[#4a4c55]">{all.length} listings · {counts.live} live · {counts.review} waiting for review</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="secondary" onClick={() => void downloadAdminExport('businesses').catch((reason) => onToast?.(reason instanceof Error ? reason.message : 'Export failed'))} icon={<Download size={18} aria-hidden="true" />}>Export CSV</Button>
          <Button type="secondary" onClick={() => setShowImport((value) => !value)} icon={<Upload size={18} aria-hidden="true" />}>Bulk upload</Button>
          <Button type="primary" onClick={onCreate} icon={<Plus size={18} aria-hidden="true" />}>Add business</Button>
        </div>
      </div>

      {showImport && <BulkImport onImported={onBusinessesImported} />}

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-[10px] border border-[#bdbcb5] bg-white px-3 focus-within:border-2 focus-within:border-[#002fa7]"><Search size={16} className="shrink-0 text-[#6e7079]" aria-hidden="true" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, owner, area, phone" aria-label="Search businesses" className="w-full bg-transparent text-[14px] outline-none" /></label>
        <select aria-label="Status" value={status} onChange={(event) => reset(setStatus)(event.target.value)} className={fieldBase}>{STATUS_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        <select aria-label="Category" value={category} onChange={(event) => reset(setCategory)(event.target.value)} className={fieldBase}><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select aria-label="Verification" value={verification} onChange={(event) => reset(setVerification)(event.target.value)} className={fieldBase}><option value="all">Any verification</option><option value="check">Verification to check ({counts.check})</option><option value="verified">Verified</option><option value="unverified">Not verified</option></select>
        <select aria-label="Owner" value={owner} onChange={(event) => reset(setOwner)(event.target.value)} className={fieldBase}><option value="all">Any owner</option><option value="none">No owner ({counts.unowned})</option></select>
      </div>

      {checked.length > 0 && (
        <div role="toolbar" aria-label="Bulk actions" className="flex flex-wrap items-center gap-2 rounded-[12px] border border-[#cdd6ef] bg-[#f7f9fd] px-4 py-3">
          <span className="mr-2 font-display text-[14px] font-semibold">{checked.length} selected</span>
          <Button type="secondary" size="s" onClick={() => void runBulk('suspend')} disabled={bulkBusy}>Suspend</Button>
          <Button type="secondary" size="s" onClick={() => void runBulk('restore')} disabled={bulkBusy}>Restore</Button>
          <button type="button" onClick={() => void runBulk('delete')} disabled={bulkBusy} className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-[#f1c9c4] bg-white px-3.5 font-display text-[14px] font-medium text-[#b42318] hover:bg-[#fdecea] disabled:opacity-50"><Trash2 size={16} aria-hidden="true" />Delete</button>
          <select aria-label="Assign to an owner" value="" disabled={bulkBusy || ownerChoices.length === 0} onChange={(event) => { if (event.target.value) void assignChecked(event.target.value); }} className={fieldBase}><option value="">Assign to owner…</option>{ownerChoices.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.email}</option>)}</select>
          <Button type="ghost" size="s" onClick={() => setChecked([])}>Clear selection</Button>
          {filtered.length > rows.length && checked.length < filtered.length && <button type="button" onClick={() => setChecked(filtered.map((row) => row.id))} className="ml-auto text-[14px] font-medium text-[#002fa7] hover:underline">Select all {filtered.length} matching</button>}
        </div>
      )}

      <div className="overflow-hidden rounded-[16px] border border-[#dcdbd5] bg-white">
        <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_120px_130px_200px] gap-4 border-b border-[#ecebe7] bg-[#f7f7f4] px-5 py-3 font-eyebrow text-[#6e7079] lg:grid"><span className="flex items-center gap-3"><input type="checkbox" aria-label="Select all on this page" checked={rows.length > 0 && rows.every((row) => checked.includes(row.id))} onChange={(event) => setChecked(event.target.checked ? [...new Set([...checked, ...rows.map((row) => row.id)])] : checked.filter((id) => !rows.some((row) => row.id === id)))} className="h-4 w-4 accent-[#002fa7]" />Business</span><span>Category</span><span>Owner</span><span>Status</span><span>Verification</span><span className="text-right">Actions</span></div>
        {rows.length === 0 ? <p className="px-6 py-14 text-center text-[15px] text-[#4a4c55]">{all.length ? 'No businesses match these filters.' : 'No businesses yet. Add the first one.'}</p> : (
          <ul>
            {rows.map((item) => {
              const image = item.images?.[0] || item.logo || '';
              return (
                <li key={item.id} className="grid grid-cols-1 items-center gap-3 border-b border-[#ecebe7] px-5 py-4 last:border-0 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_120px_130px_200px] lg:gap-4">
                  <span className="flex min-w-0 items-center gap-3"><input type="checkbox" aria-label={`Select ${item.name}`} checked={checked.includes(item.id)} onChange={(event) => setChecked(event.target.checked ? [...checked, item.id] : checked.filter((id) => id !== item.id))} className="h-4 w-4 shrink-0 accent-[#002fa7]" /><button type="button" onClick={() => setSelectedId(item.id)} className="flex min-w-0 items-center gap-3 text-left">
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[10px] bg-[#f1f1ee]">{image ? <Image src={image} alt="" unoptimized fill sizes="48px" className="object-cover" /> : <span className="grid h-full place-items-center text-[#6e7079]"><Store size={20} aria-hidden="true" /></span>}</span>
                    <span className="min-w-0"><span className="block truncate font-display text-[15px] font-semibold leading-5 text-[#101115] hover:text-[#002fa7]">{item.name}</span><span className="block truncate text-[13px] leading-[18px] text-[#6e7079]">{item.location} · {item.timeAgo}</span></span>
                  </button></span>
                  <span className="truncate text-[14px] text-[#4a4c55]">{item.category}</span>
                  <span className="min-w-0 truncate text-[14px]">{item.ownerId ? <span className="text-[#4a4c55]">{item.owner}</span> : <span className="font-medium text-[#8a5a00]">Unassigned</span>}</span>
                  <span><StatusBadge status={item.status} /></span>
                  <span><VerificationBadge business={item} /></span>
                  <span className="flex flex-wrap justify-start gap-2 lg:justify-end">
                    <Button type="secondary" size="s" onClick={() => setSelectedId(item.id)}>{item.status === 'Pending' ? 'Review' : 'Manage'}</Button>
                    <Button type="ghost" size="s" onClick={() => onEdit(item)} icon={<Pencil size={16} aria-hidden="true" />}>Edit</Button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {filtered.length > PAGE_SIZE && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ecebe7] bg-[#f7f7f4] px-5 py-3 text-[14px] text-[#4a4c55]">
            <span>{(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
            <span className="flex items-center gap-2"><Button type="secondary" size="s" onClick={() => setPage(current - 1)} disabled={current === 1} icon={<ChevronLeft size={16} aria-hidden="true" />}>Previous</Button><span>Page {current} of {pages}</span><Button type="secondary" size="s" onClick={() => setPage(current + 1)} disabled={current === pages} trailingIcon={<ChevronRight size={16} aria-hidden="true" />}>Next</Button></span>
          </div>
        )}
      </div>

      {selected && <ManagePanel key={selected.id} business={selected} onClose={close} onApprove={onApproveBusiness} onReject={onRejectBusiness} onClearMismatch={onClearGooglePlaceMismatch} onUpdated={onBusinessUpdated} onRemoved={(id) => { close(); onBusinessRemoved(id); }} onEdit={() => onEdit(selected)} />}
    </main>
  );
};

function BulkImport({ onImported }: { onImported: (businesses: BusinessListing[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ createdCount: number; failed: { row: number; businessName: string; message: string }[] } | null>(null);
  const run = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(''); setResult(null);
    try { const done = await importBusinessesCsv(file); setResult({ createdCount: done.createdCount, failed: done.failed }); onImported(done.businesses); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to import the CSV'); }
    finally { setBusy(false); event.target.value = ''; }
  };
  return (
    <section className="flex flex-col gap-3 rounded-[16px] border border-[#dcdbd5] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-[18px] font-semibold leading-[26px]">Bulk upload</h2><p className="max-w-3xl text-[14px] leading-5 text-[#4a4c55]">Up to 500 listings per file. Required columns: business name, category, city and state. Rows that pass are sent to review. Use | to separate lists.</p></div>
        <a href="/business-upload-template.csv" download className="inline-flex h-10 items-center rounded-[10px] border border-[#bdbcb5] px-4 font-display text-[14px] font-medium hover:border-[#101115]">Download template</a>
      </div>
      <input type="file" accept=".csv,text/csv" disabled={busy} onChange={(event) => void run(event)} className="text-[14px] file:mr-3 file:h-10 file:cursor-pointer file:rounded-[10px] file:border-0 file:bg-[#002fa7] file:px-4 file:font-display file:text-[14px] file:font-medium file:text-white" />
      {busy && <p role="status" className="text-[14px] text-[#002fa7]">Importing and checking each row…</p>}
      {error && <p role="alert" className="rounded-[10px] bg-[#fdecea] p-3 text-[14px] text-[#8c1d13]">{error}</p>}
      {result && <div role="status" className="rounded-[10px] bg-[#f7f7f4] p-3 text-[14px]"><p className="font-semibold">{result.createdCount} added for review · {result.failed.length} row{result.failed.length === 1 ? '' : 's'} failed</p>{result.failed.slice(0, 20).map((failure) => <p key={`${failure.row}-${failure.businessName}`} className="text-[#4a4c55]">Row {failure.row}{failure.businessName ? ` (${failure.businessName})` : ''}: {failure.message}</p>)}</div>}
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="flex flex-col gap-3 border-t border-[#ecebe7] px-6 py-5 first:border-0"><h3 className="font-eyebrow text-[#6e7079]">{title}</h3>{children}</section>;
}

function ManagePanel({ business, onClose, onApprove, onReject, onClearMismatch, onUpdated, onRemoved, onEdit }: { business: BusinessListing; onClose: () => void; onApprove: (id: string) => void; onReject: (id: string, reason?: string) => void; onClearMismatch: (id: string) => void; onUpdated: (business: BusinessListing) => void; onRemoved: (id: string) => void; onEdit: () => void }) {
  const [owners, setOwners] = useState<{ id: string; name: string; email: string }[]>([]);
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [kycReason, setKycReason] = useState('');
  const [kycRejecting, setKycRejecting] = useState(false);
  const [planDate, setPlanDate] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState('');
  const confirm = useConfirm();

  useEffect(() => { void loadAdminOwners().then(setOwners).catch(() => setOwners([])); }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [onClose]);

  const run = async (key: string, action: () => Promise<BusinessListing>) => {
    setBusy(key); setError('');
    try { onUpdated(await action()); } catch (reason) { setError(reason instanceof Error ? reason.message : 'That didn’t work. Try again.'); } finally { setBusy(''); }
  };
  const pending = business.status === 'Pending';
  const live = business.status === 'Active';
  const hasKyc = Boolean(business.gstNumber) || (business.kycDocuments?.length || 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#101115]/50" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={`Manage ${business.name}`} className="flex h-full w-full max-w-[560px] flex-col overflow-y-auto bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#ecebe7] bg-white px-6 py-5">
          <div className="min-w-0"><h2 className="truncate text-[20px] font-semibold leading-7">{business.name}</h2><div className="mt-1.5 flex flex-wrap items-center gap-2"><StatusBadge status={business.status} /><VerificationBadge business={business} />{business.plan === 'premium' && <Badge tone="sponsored">Premium</Badge>}</div></div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#dcdbd5] hover:border-[#101115]"><X size={18} aria-hidden="true" /></button>
        </header>

        {error && <p role="alert" className="mx-6 mt-4 rounded-[10px] bg-[#fdecea] px-3 py-2 text-[14px] text-[#8c1d13]">{error}</p>}

        {pending && (
          <Section title="Review this listing">
            {business.googlePlaceVerificationStatus === 'mismatch' && <p className="rounded-[10px] bg-[#fbf0d9] px-3 py-2 text-[14px] text-[#6b4700]">Google Place ID doesn’t match. It must be cleared before approval. <button type="button" onClick={() => onClearMismatch(business.id)} className="font-semibold underline">Clear it</button></p>}
            {business.reviewNote && <p className="rounded-[10px] border border-[#cfd9f3] bg-[#f3f6fd] px-3 py-2 text-[14px] leading-5 text-[#1f2d5c]"><span className="font-semibold">Sent back for review:</span> {business.reviewNote}</p>}
            {rejecting ? (
              <div className="flex flex-col gap-2"><label className="flex flex-col gap-1.5 text-[14px] font-medium">What should the owner change?<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={2000} rows={3} placeholder="They will see this on their dashboard" className="rounded-[10px] border border-[#bdbcb5] p-3 text-[14px] font-normal outline-none focus:border-2 focus:border-[#002fa7]" /></label><div className="flex gap-2"><Button type="primary" size="s" onClick={() => { onReject(business.id, reason.trim() || undefined); onClose(); }}>Send rejection</Button><Button type="ghost" size="s" onClick={() => setRejecting(false)}>Cancel</Button></div></div>
            ) : (
              <div className="flex flex-wrap gap-2"><Button type="primary" size="s" onClick={() => { onApprove(business.id); onClose(); }} disabled={business.googlePlaceVerificationStatus === 'mismatch'}>Approve and publish</Button><Button type="secondary" size="s" onClick={() => setRejecting(true)}>Reject</Button></div>
            )}

          </Section>
        )}
        <Section title="Listing">
          <div className="flex flex-wrap gap-2">
            <Button type="primary" size="s" onClick={onEdit} icon={<Pencil size={16} aria-hidden="true" />}>Edit all details</Button>
            <Button type="secondary" size="s" href={publicPath(business)} target="_blank" icon={<ExternalLink size={16} aria-hidden="true" />}>{live ? 'View public page' : 'Preview as customer'}</Button>
          </div>
        </Section>
        <AdminListingDetails id={business.id} />
        {business.status === 'Rejected' && business.rejectionReason && <Section title="Rejected"><p className="rounded-[10px] bg-[#fdecea] px-3 py-2 text-[14px] text-[#8c1d13]">{business.rejectionReason}</p></Section>}

        <Section title="Verification">
          <p className="text-[14px] text-[#4a4c55]">GST: {business.gstNumber || 'Not provided'}</p>
          {(business.kycDocuments?.length || 0) > 0 && <p className="flex flex-wrap gap-x-4 gap-y-1 text-[14px]">{business.kycDocuments?.map((doc, index) => <a key={doc.url} href={doc.url} target="_blank" rel="noreferrer" className="font-medium text-[#002fa7] underline">{doc.type.replace(/_/g, ' ')} {index + 1}</a>)}</p>}
          {business.kycStatus === 'rejected' && business.kycRejectionReason && <p className="rounded-[10px] bg-[#fdecea] px-3 py-2 text-[14px] text-[#8c1d13]">Rejected: {business.kycRejectionReason}</p>}
          {!hasKyc ? <p className="text-[14px] text-[#6e7079]">The owner hasn’t added a GST number or document yet.</p> : kycRejecting ? (
            <div className="flex flex-col gap-2"><label className="flex flex-col gap-1.5 text-[14px] font-medium">Why not verified?<textarea value={kycReason} onChange={(event) => setKycReason(event.target.value)} maxLength={500} rows={2} placeholder="e.g. The document is unclear. Please upload a clear photo." className="rounded-[10px] border border-[#bdbcb5] p-3 text-[14px] font-normal outline-none focus:border-2 focus:border-[#002fa7]" /></label><div className="flex gap-2"><Button type="primary" size="s" disabled={busy === 'kyc'} onClick={() => { setKycRejecting(false); void run('kyc', () => reviewKyc(business.id, 'reject', kycReason.trim())); }}>Reject verification</Button><Button type="ghost" size="s" onClick={() => setKycRejecting(false)}>Cancel</Button></div></div>
          ) : (
            <div className="flex flex-wrap gap-2"><Button type="primary" size="s" disabled={busy === 'kyc' || business.kycStatus === 'verified'} onClick={() => void run('kyc', () => reviewKyc(business.id, 'approve'))} icon={<ShieldCheck size={16} aria-hidden="true" />}>Verify business</Button><Button type="secondary" size="s" disabled={busy === 'kyc' || business.kycStatus === 'rejected'} onClick={() => setKycRejecting(true)}>Reject verification</Button></div>
          )}
        </Section>

        <Section title="Owner">
          <p className="text-[14px]">{business.ownerId ? <>{business.owner}</> : <span className="font-medium text-[#8a5a00]">No owner yet. The listing can’t be managed by anyone until you assign one.</span>}</p>
          <select aria-label="Assign owner" value="" disabled={busy === 'owner' || owners.length === 0} onChange={async (event) => { const id = event.target.value; const target = owners.find((item) => item.id === id); if (!id || !target) return; const pw = await confirm({ title: `Give “${business.name}” to ${target.name}?`, message: 'They replace the current owner and can edit the listing straight away.', confirmLabel: 'Assign owner', tone: 'warning', askCode: true }); if (pw) void run('owner', () => assignBusinessOwner(business.id, id, String(pw))); }} className={cx(fieldBase, 'w-full')}><option value="">{busy === 'owner' ? 'Assigning…' : business.ownerId ? 'Move to another owner…' : owners.length ? 'Assign an owner…' : 'No active owners available'}</option>{owners.filter((item) => item.id !== business.ownerId).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.email}</option>)}</select>
        </Section>

        <Section title="Plan (featured placement)">
          <p className="text-[14px] text-[#4a4c55]">{business.plan === 'premium' ? `Premium${business.planExpiresAt ? ` until ${new Date(business.planExpiresAt).toLocaleDateString('en-IN')}` : ''}. Shown as Sponsored and ranked higher.` : 'Free plan.'}</p>
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" aria-label="Premium until" min={new Date().toISOString().slice(0, 10)} value={planDate} onChange={(event) => setPlanDate(event.target.value)} className={fieldBase} />
            <Button type="secondary" size="s" disabled={!planDate || busy === 'plan'} onClick={() => void run('plan', () => setBusinessPlan(business.id, 'premium', new Date(`${planDate}T23:59:59`).toISOString()))}>Make premium</Button>
            {business.plan === 'premium' && <Button type="ghost" size="s" disabled={busy === 'plan'} onClick={() => void run('plan', () => setBusinessPlan(business.id, 'free'))}>Set to free</Button>}
          </div>
        </Section>

        <Section title="Visibility and removal">
          <div className="flex flex-wrap gap-2">
            {(live || business.status === 'Paused') && <Button type="secondary" size="s" disabled={busy === 'status'} onClick={async () => { if (await confirm({ title: `Suspend “${business.name}”?`, message: 'It disappears from search and its public page stops working until you restore it. The owner is told by email.', confirmLabel: 'Suspend listing', tone: 'warning' })) void run('status', () => setAdminBusinessStatus(business.id, 'suspended')); }}>Suspend listing</Button>}
            {business.status === 'Suspended' && <Button type="primary" size="s" disabled={busy === 'status'} onClick={() => void run('status', () => setAdminBusinessStatus(business.id, 'published'))}>Restore listing</Button>}
          </div>
          <div className="flex flex-col gap-2 rounded-[10px] border border-[#f1c9c4] bg-[#fff8f7] p-3">
            <p className="text-[14px] leading-5 text-[#4a4c55]">Delete removes the listing everywhere. Type its name to confirm.</p>
            <div className="flex flex-wrap gap-2"><input value={confirmDelete} onChange={(event) => setConfirmDelete(event.target.value)} placeholder={business.name} aria-label="Type the business name to confirm" className={cx(fieldBase, 'min-w-0 flex-1')} /><button type="button" disabled={busy === 'delete' || confirmDelete.trim().toLowerCase() !== business.name.trim().toLowerCase()} onClick={async () => { const pw = await confirm({ title: `Delete “${business.name}”?`, message: 'It disappears from the site and from its owner’s dashboard. There is no undo in the app.', confirmLabel: 'Delete listing', tone: 'danger', askCode: true }); if (!pw) return; setBusy('delete'); setError(''); try { await deleteAdminBusiness(business.id, String(pw)); onRemoved(business.id); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete'); setBusy(''); } }} className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-[#b42318] px-4 font-display text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#e4e3de] disabled:text-[#9a9ba3]"><Trash2 size={16} aria-hidden="true" />Delete</button></div>
          </div>
        </Section>
        <div className="mt-auto flex items-center gap-2 border-t border-[#ecebe7] px-6 py-4 text-[13px] text-[#6e7079]"><BadgeCheck size={16} aria-hidden="true" />Changes here apply immediately.</div>
      </aside>
    </div>
  );
}
