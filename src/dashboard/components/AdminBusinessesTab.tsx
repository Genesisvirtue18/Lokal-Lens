import React, { useEffect, useState } from 'react';
import { assignBusinessOwner, importBusinessesCsv, loadAdminOwners, reviewKyc, setBusinessPlan } from '../api';
import { BusinessListing } from '../types';
import { BusinessProfileForm } from './BusinessProfileForm';

interface AdminBusinessesTabProps {
  activeBusinesses: BusinessListing[];
  pendingBusinesses: BusinessListing[];
  onInspectBusiness: (biz: BusinessListing) => void;
  onApproveBusiness: (id: string) => void;
  onRejectBusiness: (id: string, reason?: string) => void;
  onClearGooglePlaceMismatch: (id: string) => void;
  onBackToOverview: () => void;
  onBusinessesImported: (businesses: BusinessListing[]) => void;
  onBusinessUpdated: (business: BusinessListing) => void;
}

export const AdminBusinessesTab: React.FC<AdminBusinessesTabProps> = ({
  activeBusinesses,
  pendingBusinesses,
  onInspectBusiness,
  onApproveBusiness,
  onRejectBusiness,
  onClearGooglePlaceMismatch,
  onBackToOverview,
  onBusinessesImported,
  onBusinessUpdated,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState<{ createdCount: number; failed: { row: number; businessName: string; message: string }[] } | null>(null);
  const [owners, setOwners] = useState<{ id: string; name: string; email: string }[]>([]);
  const [ownerAssignmentError, setOwnerAssignmentError] = useState('');
  const [assigningBusiness, setAssigningBusiness] = useState('');
  const [creating, setCreating] = useState(false);
  const [planDates, setPlanDates] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const runAction = async (id: string, action: () => Promise<BusinessListing>) => {
    setBusy(id); setActionError('');
    try { onBusinessUpdated(await action()); } catch (reason) { setActionError(reason instanceof Error ? reason.message : 'Action failed'); } finally { setBusy(''); }
  };

  useEffect(() => {
    void loadAdminOwners().then(setOwners).catch(() => setOwnerAssignmentError('Could not load owner accounts. Refresh and try again.'));
  }, []);

  const allListings = [...pendingBusinesses, ...activeBusinesses];
  const categories = ['All', ...new Set(allListings.map(item => item.category))];

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError('');
    setImportResult(null);
    try {
      const result = await importBusinessesCsv(file);
      setImportResult({ createdCount: result.createdCount, failed: result.failed });
      onBusinessesImported(result.businesses);
    } catch (reason) {
      setImportError(reason instanceof Error ? reason.message : 'Unable to import business CSV');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const assignOwner = async (businessId: string, ownerId: string) => {
    if (!ownerId) return;
    setAssigningBusiness(businessId);
    setOwnerAssignmentError('');
    try {
      const updated = await assignBusinessOwner(businessId, ownerId);
      onBusinessUpdated(updated);
    } catch (reason) {
      setOwnerAssignmentError(reason instanceof Error ? reason.message : 'Unable to assign this listing to the owner');
    } finally {
      setAssigningBusiness('');
    }
  };

  const filtered = allListings.filter((b) => {
    if (filterCategory !== 'All' && b.category !== filterCategory) return false;
    if (filterStatus !== 'All' && b.status !== filterStatus) return false;
    if (
      search &&
      !b.name.toLowerCase().includes(search.toLowerCase()) &&
      !b.owner.toLowerCase().includes(search.toLowerCase()) &&
      !b.location.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-24 md:pb-8 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToOverview}
            className="p-1 rounded-xl hover:bg-[#f1f1ee] text-[#002fa7] cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div>
            <h2 className="text-[20px] font-bold text-[#1b1b1e] font-headline-md">
              Businesses
            </h2>
            <p className="text-[13px] text-[#4a4c55]">
              {allListings.length} total local listings managed
            </p>
          </div>
        </div>

      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dcdbd5] bg-white p-4">
        <div>
          <h3 className="text-[15px] font-bold text-[#1b1b1e]">Add a business</h3>
          <p className="mt-1 text-[13px] text-[#4a4c55]">Create a complete listing yourself: categories, services, hours, photos and more. Publish it right away or save a draft.</p>
        </div>
        <button onClick={() => setCreating(true)} className="rounded-xl bg-[#002fa7] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[#00247f]">+ Add business</button>
      </div>

      <section className="rounded-xl border border-[#dcdbd5] bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-bold text-[#1b1b1e]">Bulk upload businesses</h3>
            <p className="mt-1 max-w-3xl text-[13px] text-[#4a4c55]">
              Import up to 500 listings at a time. Valid rows are submitted for admin review. Required fields: business name, category, city, and state. Owner email, description, services, phone, email, and address details can be blank. Unassigned listings need an owner assigned before that owner can edit them. Use pipe separators (|) for lists and download the sample for all supported columns.
            </p>
          </div>
          <a href="/business-upload-template.csv" download className="rounded-xl border border-[#002fa7] px-3 py-2 text-[13px] font-semibold text-[#002fa7] hover:bg-[#f1f1ee]">
            Download CSV template
          </a>
        </div>
        <label className="mt-3 block text-[13px] font-medium text-[#4a4c55]">
          Select a business CSV
          <input type="file" accept=".csv,text/csv" disabled={importing} onChange={event => void importFile(event)} className="mt-1 block w-full text-[13px] file:mr-3 file:rounded-xl file:border-0 file:bg-[#002fa7] file:px-3 file:py-2 file:font-semibold file:text-white disabled:opacity-50" />
        </label>
        {importing && <p role="status" className="mt-3 text-[13px] text-[#002fa7]">Importing CSV and validating each row…</p>}
        {importError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-[13px] text-red-700">{importError}</p>}
        {importResult && <div role="status" className="mt-3 rounded-xl bg-[#f1f1ee] p-3 text-[13px] text-[#3d176e]">
          <p className="font-semibold">{importResult.createdCount} business{importResult.createdCount === 1 ? '' : 'es'} submitted for admin review; {importResult.failed.length} row{importResult.failed.length === 1 ? '' : 's'} failed.</p>
          {importResult.failed.length > 0 && <ul className="mt-2 space-y-1">
            {importResult.failed.slice(0, 20).map(failure => <li key={`${failure.row}-${failure.businessName}`}>Row {failure.row}{failure.businessName ? ` (${failure.businessName})` : ''}: {failure.message}</li>)}
            {importResult.failed.length > 20 && <li>And {importResult.failed.length - 20} more failed rows.</li>}
          </ul>}
        </div>}
        {ownerAssignmentError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-[13px] text-red-700">{ownerAssignmentError}</p>}
      </section>

      {/* Category filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1 rounded-xl text-[13px] font-semibold whitespace-nowrap cursor-pointer transition-all ${
              filterCategory === cat
                ? 'bg-[#002fa7] text-white shadow-xs'
                : 'bg-[#f1f1ee] text-[#4a4c55] hover:bg-[#e8edfb]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search and status filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-base text-[#4a4c55]">
            search
          </span>
          <input
            type="text"
            placeholder="Search businesses, owners..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-[13px] pl-9 pr-3 py-2 rounded-xl bg-white border border-[#dcdbd5] focus:outline-none focus:border-[#002fa7]"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-[13px] px-2.5 py-2 rounded-xl border border-[#dcdbd5] bg-white font-medium text-[#1b1b1e] focus:outline-none"
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Rejected">Rejected</option>
          <option value="Draft">Draft</option>
          <option value="Suspended">Suspended</option>
        </select>
      </div>

      {actionError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-[13px] text-red-700">{actionError}</p>}
      {/* Listings items */}
      <div className="grid gap-3 lg:grid-cols-2">
        {filtered.map((biz) => (
          <div
            key={biz.id}
            className="bg-white p-3.5 rounded-xl border border-[#dcdbd5] shadow-xs space-y-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-bold text-[14px] text-[#1b1b1e]">{biz.name}</h4>
                  <span
                    className={`text-[12px] font-bold px-1.5 py-0.2 rounded-xl border ${biz.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : biz.status === 'Pending' ? 'bg-amber-50 text-amber-800 border-amber-200' : biz.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}
                  >
                    {biz.status}
                  </span>
                </div>
                <p className="text-[13px] text-[#4a4c55] mt-0.5">Owner: {biz.owner}</p>
                {!biz.ownerId && <label className="mt-2 block max-w-sm text-[13px] font-medium text-[#4a4c55]">Assign this listing so its owner can complete missing details
                  <select value="" disabled={assigningBusiness === biz.id || owners.length === 0} onChange={event => void assignOwner(biz.id, event.target.value)} className="mt-1 block w-full rounded-xl border border-[#dcdbd5] bg-white px-2 py-2 text-[13px] text-[#1b1b1e] disabled:opacity-60">
                    <option value="">{assigningBusiness === biz.id ? 'Assigning…' : owners.length ? 'Choose an active business owner' : 'No active owners available'}</option>
                    {owners.map(owner => <option key={owner.id} value={owner.id}>{owner.name} · {owner.email}</option>)}
                  </select>
                </label>}
                <p className="text-[13px] text-[#4a4c55]">
                  {biz.category} • {biz.location}
                </p>
                {biz.googlePlaceVerificationStatus === 'mismatch' && <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2 text-[13px] text-amber-900"><p className="font-semibold">Google Place ID mismatch. It is not proof of ownership.</p><button onClick={() => onClearGooglePlaceMismatch(biz.id)} className="mt-1 font-semibold underline">Clear mismatched Place ID</button></div>}
              </div>

              <button
                onClick={() => onInspectBusiness(biz)}
                className="p-1 text-[#002fa7] hover:bg-[#e8edfb] rounded-xl cursor-pointer"
                title="View Listing Details"
              >
                <span className="material-symbols-outlined text-lg">visibility</span>
              </button>
            </div>

            <div className="pt-2 border-t border-[#f1f1ee] grid gap-3 sm:grid-cols-2 text-[13px]">
              <div className="space-y-1.5">
                <p className="font-semibold text-[#1b1b1e]">KYC verification
                  <span className={`ml-2 rounded-xl px-1.5 py-0.5 text-[13px] font-bold ${biz.kycStatus === 'verified' ? 'bg-emerald-50 text-emerald-700' : biz.kycStatus === 'submitted' ? 'bg-amber-50 text-amber-800' : biz.kycStatus === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-[#f1f1ee] text-[#4a4c55]'}`}>{(biz.kycStatus || 'not_submitted').replace('_', ' ')}</span>
                </p>
                <p className="text-[#4a4c55]">GST: {biz.gstNumber || 'Not provided'}</p>
                {(biz.kycDocuments?.length ?? 0) > 0 && <p className="flex flex-wrap gap-x-3">{biz.kycDocuments?.map((doc, index) => <a key={doc.url} href={doc.url} target="_blank" rel="noreferrer" className="text-[#002fa7] underline">{doc.type.replace('_', ' ')} {index + 1}</a>)}</p>}
                {(biz.gstNumber || (biz.kycDocuments?.length ?? 0) > 0) && <div className="flex gap-2">
                  <button disabled={busy === biz.id || biz.kycStatus === 'verified'} onClick={() => void runAction(biz.id, () => reviewKyc(biz.id, 'approve'))} className="rounded-xl bg-emerald-600 px-3 py-1.5 font-semibold text-white disabled:opacity-50">Verify</button>
                  <button disabled={busy === biz.id || biz.kycStatus === 'rejected'} onClick={() => { const reason = window.prompt('Why is the verification being rejected? The owner will see this.', 'The document is unclear. Please upload a clear photo.'); if (reason === null) return; void runAction(biz.id, () => reviewKyc(biz.id, 'reject', reason.trim())); }} className="rounded-xl border border-[#dcdbd5] px-3 py-1.5 font-semibold text-[#ba1a1a] disabled:opacity-50">Reject</button>
                </div>}
              </div>
              <div className="space-y-1.5">
                <p className="font-semibold text-[#1b1b1e]">Plan
                  <span className={`ml-2 rounded-xl px-1.5 py-0.5 text-[13px] font-bold ${biz.plan === 'premium' ? 'bg-amber-100 text-amber-900' : 'bg-[#f1f1ee] text-[#4a4c55]'}`}>{biz.plan === 'premium' ? 'Premium' : 'Free'}</span>
                </p>
                {biz.plan === 'premium' && biz.planExpiresAt && <p className="text-[#4a4c55]">Until {new Date(biz.planExpiresAt).toLocaleDateString('en-IN')}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  <input type="date" aria-label="Premium expiry date" min={new Date().toISOString().slice(0, 10)} value={planDates[biz.id] || ''} onChange={event => setPlanDates(current => ({ ...current, [biz.id]: event.target.value }))} className="rounded-xl border border-[#dcdbd5] px-2 py-1.5" />
                  <button disabled={busy === biz.id || !planDates[biz.id]} onClick={() => void runAction(biz.id, () => setBusinessPlan(biz.id, 'premium', new Date(`${planDates[biz.id]}T23:59:59`).toISOString()))} className="rounded-xl bg-[#002fa7] px-3 py-1.5 font-semibold text-white disabled:opacity-50">Make premium</button>
                  {biz.plan === 'premium' && <button disabled={busy === biz.id} onClick={() => void runAction(biz.id, () => setBusinessPlan(biz.id, 'free'))} className="rounded-xl border border-[#dcdbd5] px-3 py-1.5 font-semibold">Set free</button>}
                </div>
              </div>
            </div>
            {biz.status === 'Pending' ? (
              <div className="pt-2 border-t border-[#f1f1ee] space-y-2">
                <label className="block text-[13px] font-medium text-[#4a4c55]">Reason if rejecting<textarea value={rejectionReasons[biz.id] || ''} onChange={event => setRejectionReasons(current => ({ ...current, [biz.id]: event.target.value }))} maxLength={2000} className="mt-1 w-full rounded-xl border border-[#dcdbd5] p-2 text-[13px] text-[#1b1b1e]" placeholder="Tell the owner what needs to change (optional)" /></label>
                <div className="flex items-center gap-2">
                <button
                  onClick={() => onApproveBusiness(biz.id)}
                  disabled={biz.googlePlaceVerificationStatus === 'mismatch'}
                  title={biz.googlePlaceVerificationStatus === 'mismatch' ? 'A mismatched Google Place ID must be corrected before approval.' : undefined}
                  className="flex-1 py-1.5 bg-[#6d28d9] hover:bg-[#002fa7] text-white text-[13px] font-bold rounded-xl cursor-pointer"
                >
                  Approve
                </button>
                <button
                  onClick={() => onRejectBusiness(biz.id, rejectionReasons[biz.id]?.trim())}
                  className="flex-1 py-1.5 bg-white border border-[#dcdbd5] text-[#ba1a1a] text-[13px] font-bold rounded-xl cursor-pointer"
                >
                  Reject
                </button>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-[#f1f1ee] flex items-center justify-between text-[13px] text-[#4a4c55]">
                <span className={`flex items-center gap-1 font-semibold ${biz.status === 'Active' ? 'text-emerald-700' : biz.status === 'Rejected' ? 'text-red-700' : 'text-slate-600'}`}>
                  <span className="material-symbols-outlined text-xs">{biz.status === 'Active' ? 'verified' : biz.status === 'Rejected' ? 'cancel' : 'draft'}</span>
                  {biz.status === 'Active' ? 'Live on Directory' : biz.status}
                </span>
                <span>Phone: {biz.phone}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      {creating && <BusinessProfileForm adminOptions={{ owners }} onClose={() => setCreating(false)} onSaved={created => { onBusinessUpdated(created); setCreating(false); }} />}
    </main>
  );
};
