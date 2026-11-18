import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, ExternalLink, Mail, Plus, Search, Star, UserCheck, UserX, X } from 'lucide-react';
import { Badge, Button, cx } from '@/components/ds';
import { useConfirm } from '@/components/ConfirmProvider';
import { AdminUser, AdminUserDetail, changeAdminUserRole, createAdminUser, downloadAdminExport, ListingAction, loadAdminUser, loadAdminUsers, ownerListingsAction, Paged, setAdminUserStatus } from '../api';

const field = 'h-10 rounded-[10px] border border-[#bdbcb5] bg-white px-3 text-[14px] outline-none focus:border-2 focus:border-[#002fa7]';
const ROLE: Record<AdminUser['role'], string> = { customer: 'Customer', business_owner: 'Business owner', admin: 'Admin', super_admin: 'Admin' };
const when = (value?: string) => (value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const LISTING_STATUS: Record<string, string> = { published: 'Live', pending_review: 'In review', draft: 'Draft', paused: 'Paused', suspended: 'Suspended', rejected: 'Rejected' };

function RoleBadge({ role }: { role: AdminUser['role'] }) {
  const tone = role === 'business_owner' ? 'bg-[#e6ebf7] text-[#002fa7]' : role === 'customer' ? 'bg-[#f1f1ee] text-[#4a4c55]' : 'bg-[#f4e6f9] text-[#6b1f8a]';
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 font-display text-[13px] font-medium', tone)}>{ROLE[role]}</span>;
}

export const AdminPeopleTab: React.FC<{ openId?: string; onCloseOpen?: () => void; onOpenBusiness: (id: string) => void; onListingsChanged?: () => void; showToast: (message: string) => void }> = ({ openId, onCloseOpen, onOpenBusiness, onListingsChanged, showToast }) => {
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [adding, setAdding] = useState(false);
  const [pickedId, setSelectedId] = useState('');
  const selectedId = pickedId || openId || '';
  const [result, setResult] = useState<{ key: string; data?: Paged<AdminUser>; error?: string }>({ key: '' });

  useEffect(() => { const timer = setTimeout(() => { setTerm(search.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);
  const key = JSON.stringify([role, status, term, page, version]);
  useEffect(() => {
    let live = true;
    loadAdminUsers({ role, status, search: term, page, limit: 20 }).then((data) => { if (live) setResult({ key, data }); }).catch((reason) => { if (live) setResult({ key, error: reason instanceof Error ? reason.message : 'Unable to load people' }); });
    return () => { live = false; };
  }, [key, role, status, term, page]);
  const loading = result.key !== key;
  const data = result.data;
  const rows = data?.items || [];
  const total = data?.pagination.totalItems || 0;

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 pb-24 pt-8 md:px-8 lg:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4"><div className="flex flex-col gap-2"><p className="font-eyebrow text-[#002fa7]">Admin</p><h1 className="text-[28px] font-semibold leading-9 tracking-[-0.0294em] md:text-[34px] md:leading-[42px]">People</h1><p className="text-[16px] leading-6 text-[#4a4c55]">Every customer and business owner: which listings they own, which reviews they wrote, and whether their account is active.</p></div><div className="flex flex-wrap gap-2"><Button type="secondary" onClick={() => void downloadAdminExport('users').catch((reason) => showToast(reason instanceof Error ? reason.message : 'Export failed'))} icon={<Download size={18} aria-hidden="true" />}>Export CSV</Button><Button type="primary" onClick={() => setAdding(true)} icon={<Plus size={18} aria-hidden="true" />}>Add person</Button></div></div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Account type" className="flex rounded-[10px] border border-[#bdbcb5] bg-white p-1">
          {[['all', 'Everyone'], ['business_owner', 'Business owners'], ['customer', 'Customers'], ['admin', 'Admins']].map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={role === value} onClick={() => { setRole(value); setPage(1); }} className={cx('h-8 rounded-[8px] px-3 font-display text-[14px] font-medium', role === value ? 'bg-[#002fa7] text-white' : 'text-[#4a4c55] hover:bg-[#f1f1ee]')}>{label}</button>)}
        </div>
        <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-[10px] border border-[#bdbcb5] bg-white px-3 focus-within:border-2 focus-within:border-[#002fa7]"><Search size={16} className="shrink-0 text-[#6e7079]" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or phone" aria-label="Search people" className="w-full bg-transparent text-[14px] outline-none" /></label>
        <select aria-label="Account status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={field}><option value="all">Any status</option><option value="active">Active</option><option value="suspended">Suspended</option></select>
      </div>

      {result.error && <p role="alert" className="rounded-[10px] bg-[#fdecea] px-4 py-3 text-[14px] text-[#8c1d13]">{result.error}</p>}

      <div className={cx('overflow-hidden rounded-[16px] border border-[#dcdbd5] bg-white transition-opacity', loading && 'opacity-60')}>
        <div className="hidden grid-cols-[minmax(0,2fr)_150px_110px_90px_90px_120px_120px] gap-4 border-b border-[#ecebe7] bg-[#f7f7f4] px-5 py-3 font-eyebrow text-[#6e7079] lg:grid"><span>Person</span><span>Type</span><span>Status</span><span>Listings</span><span>Reviews</span><span>Joined</span><span>Last sign-in</span></div>
        {!rows.length ? <p className="px-6 py-14 text-center text-[15px] text-[#4a4c55]">{loading ? 'Loading…' : 'No one matches these filters.'}</p> : (
          <ul>{rows.map((user) => (
            <li key={user._id}>
              <button type="button" onClick={() => setSelectedId(user._id)} className="grid w-full grid-cols-1 items-center gap-2 border-b border-[#ecebe7] px-5 py-4 text-left last:border-0 hover:bg-[#f7f7f4] lg:grid-cols-[minmax(0,2fr)_150px_110px_90px_90px_120px_120px] lg:gap-4">
                <span className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e6ebf7] font-display text-[14px] font-semibold text-[#002fa7]">{(user.name || '?').slice(0, 1).toUpperCase()}</span><span className="min-w-0"><span className="block truncate font-display text-[15px] font-semibold leading-5">{user.name}</span><span className="block truncate text-[13px] leading-[18px] text-[#6e7079]">{user.email || user.phone}</span></span></span>
                <span><RoleBadge role={user.role} /></span>
                <span>{user.status === 'active' ? <Badge tone="live">Active</Badge> : <Badge tone="closed">Suspended</Badge>}</span>
                <span className="text-[14px] tabular-nums">{user.role === 'business_owner' ? user.listingsCount : '—'}</span>
                <span className="text-[14px] tabular-nums">{user.reviewsCount || (user.role === 'customer' ? 0 : '—')}</span>
                <span className="text-[13px] text-[#4a4c55]">{when(user.createdAt)}</span>
                <span className="text-[13px] text-[#4a4c55]">{when(user.lastLoginAt)}</span>
              </button>
            </li>
          ))}</ul>
        )}
        {total > 20 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ecebe7] bg-[#f7f7f4] px-5 py-3 text-[14px] text-[#4a4c55]">
            <span>{(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</span>
            <span className="flex items-center gap-2"><Button type="secondary" size="s" onClick={() => setPage(page - 1)} disabled={page === 1} icon={<ChevronLeft size={16} aria-hidden="true" />}>Previous</Button><span>Page {page} of {data?.pagination.totalPages}</span><Button type="secondary" size="s" onClick={() => setPage(page + 1)} disabled={!data || page >= data.pagination.totalPages} trailingIcon={<ChevronRight size={16} aria-hidden="true" />}>Next</Button></span>
          </div>
        )}
      </div>

      {adding && <AddPersonDialog onClose={() => setAdding(false)} onCreated={() => { setAdding(false); setVersion((value) => value + 1); showToast('Account created. They sign in with an emailed code.'); }} />}
      {selectedId && <PersonPanel key={selectedId} id={selectedId} onClose={() => { setSelectedId(''); onCloseOpen?.(); }} onChanged={() => setVersion((value) => value + 1)} onOpenBusiness={(id) => { setSelectedId(''); onCloseOpen?.(); onOpenBusiness(id); }} onListingsChanged={onListingsChanged} showToast={showToast} />}
    </main>
  );
};

function PersonPanel({ id, onClose, onChanged, onOpenBusiness, onListingsChanged, showToast }: { id: string; onClose: () => void; onChanged: () => void; onOpenBusiness: (id: string) => void; onListingsChanged?: () => void; showToast: (message: string) => void }) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();

  useEffect(() => { let live = true; loadAdminUser(id).then((data) => { if (live) setDetail(data); }).catch((reason) => { if (live) setError(reason instanceof Error ? reason.message : 'Unable to load this person'); }); return () => { live = false; }; }, [id]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [onClose]);

  const bulk = async (action: ListingAction) => {
    const total = detail?.listings.length || 0;
    const ok = action === 'delete' ? await confirm({ title: `Delete all ${total} listing${total === 1 ? '' : 's'} of ${detail?.item.name}?`, message: 'They disappear from the site and from this owner’s dashboard. There is no undo in the app.', confirmLabel: `Delete ${total} listing${total === 1 ? '' : 's'}`, tone: 'danger', requireText: 'DELETE', askPassword: true })
      : action === 'suspend' ? await confirm({ title: `Suspend all listings of ${detail?.item.name}?`, message: 'Their live and paused listings are hidden from search until you restore them.', confirmLabel: 'Suspend all', tone: 'warning' })
        : await confirm({ title: `Restore all listings of ${detail?.item.name}?`, message: 'Suspended listings go live again.', confirmLabel: 'Restore all', tone: 'primary' });
    if (!ok) return;
    setBusy(true); setError('');
    try { const done = await ownerListingsAction(id, action, typeof ok === 'string' ? ok : undefined); showToast(`${done.count} listing${done.count === 1 ? '' : 's'} ${action === 'suspend' ? 'suspended' : action === 'restore' ? 'restored' : 'deleted'}.`); setDetail(await loadAdminUser(id)); onChanged(); onListingsChanged?.(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'That didn’t work'); }
    finally { setBusy(false); }
  };
  const changeRole = async (role: 'customer' | 'business_owner' | 'admin') => {
    if (!detail || role === detail.item.role) return;
    const ok = role === 'admin' ? await confirm({ title: `Make ${detail.item.name} an admin?`, message: 'They will be able to manage every listing, account and review. Only do this for someone you fully trust.', confirmLabel: 'Make admin', tone: 'danger', requireText: 'ADMIN', askPassword: true }) : await confirm({ title: `Change ${detail.item.name} to ${role === 'customer' ? 'a customer' : 'a business owner'}?`, message: role === 'customer' ? 'They lose access to the owner dashboard. Their listings stay where they are.' : 'They get the owner dashboard and can add listings.', confirmLabel: 'Change', tone: 'warning', askPassword: true });
    if (!ok) return;
    setBusy(true); setError('');
    try { await changeAdminUserRole(detail.item._id, role, typeof ok === 'string' ? ok : undefined); setDetail(await loadAdminUser(id)); onChanged(); showToast('Account type updated.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'That didn’t work'); }
    finally { setBusy(false); }
  };
  const user = detail?.item;
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const toggle = async () => {
    if (!user) return;
    const next = user.status === 'active' ? 'suspended' : 'active';
    const pw = next === 'suspended' ? await confirm({ title: `Suspend ${user.name}?`, message: 'They are signed out everywhere and can’t sign in until you reactivate the account. Their listings stay live.', confirmLabel: 'Suspend account', tone: 'warning', askPassword: true }) : true;
    if (!pw) return;
    setBusy(true); setError('');
    try { await setAdminUserStatus(user._id, next, typeof pw === 'string' ? pw : undefined); setDetail((current) => (current ? { ...current, item: { ...current.item, status: next } } : current)); onChanged(); showToast(next === 'suspended' ? 'Account suspended.' : 'Account reactivated.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'That didn’t work'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#101115]/50" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label="Person details" className="flex h-full w-full max-w-[560px] flex-col overflow-y-auto bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#ecebe7] bg-white px-6 py-5">
          <div className="min-w-0"><h2 className="truncate text-[20px] font-semibold leading-7">{user?.name || 'Loading…'}</h2>{user && <div className="mt-1.5 flex flex-wrap items-center gap-2"><RoleBadge role={user.role} />{user.status === 'active' ? <Badge tone="live">Active</Badge> : <Badge tone="closed">Suspended</Badge>}</div>}</div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#dcdbd5] hover:border-[#101115]"><X size={18} aria-hidden="true" /></button>
        </header>
        {error && <p role="alert" className="mx-6 mt-4 rounded-[10px] bg-[#fdecea] px-3 py-2 text-[14px] text-[#8c1d13]">{error}</p>}
        {user && (
          <>
            <section className="flex flex-col gap-3 px-6 py-5">
              <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-2 text-[14px] leading-5">
                <dt className="text-[#6e7079]">Email</dt><dd className="break-all">{user.email || '—'}{user.email && <span className="ml-2 text-[12px] text-[#6e7079]">{user.emailVerified ? 'confirmed' : 'not confirmed'}</span>}</dd>
                <dt className="text-[#6e7079]">Phone</dt><dd>{user.phone || '—'}</dd>
                <dt className="text-[#6e7079]">Joined</dt><dd>{when(user.createdAt)}</dd>
                <dt className="text-[#6e7079]">Last sign-in</dt><dd>{when(user.lastLoginAt)}</dd>
              </dl>
              <div className="flex flex-wrap gap-2">
                {user.email && <Button type="secondary" size="s" href={`mailto:${user.email}`} icon={<Mail size={16} aria-hidden="true" />}>Email</Button>}
                {!isAdmin && <Button type={user.status === 'active' ? 'secondary' : 'primary'} size="s" onClick={() => void toggle()} disabled={busy} icon={user.status === 'active' ? <UserX size={16} aria-hidden="true" /> : <UserCheck size={16} aria-hidden="true" />}>{user.status === 'active' ? 'Suspend account' : 'Reactivate account'}</Button>}
              </div>
            </section>

            <section className="flex flex-col gap-2 border-t border-[#ecebe7] px-6 py-5">
              <h3 className="font-eyebrow text-[#6e7079]">Account type</h3>
              {user.role === 'super_admin' || user.role === 'admin' ? <p className="text-[14px] text-[#4a4c55]">{user.role === 'super_admin' ? 'Super admin. This can’t be changed here.' : 'Admin. Only a super admin can change this.'}</p> : (
                <select aria-label="Account type" value={user.role} disabled={busy} onChange={(event) => void changeRole(event.target.value as 'customer' | 'business_owner' | 'admin')} className="h-10 max-w-[280px] rounded-[10px] border border-[#bdbcb5] bg-white px-3 text-[14px]"><option value="customer">Customer</option><option value="business_owner">Business owner</option><option value="admin">Admin (super admin only)</option></select>
              )}
              {user.role === 'business_owner' && detail.listings.length > 0 && <p className="text-[13px] text-[#6e7079]">Changing this person to a customer doesn’t move their {detail.listings.length} listings. Reassign or suspend them first.</p>}
            </section>

            {user.role === 'business_owner' && (
              <section className="flex flex-col gap-3 border-t border-[#ecebe7] px-6 py-5">
                <h3 className="font-eyebrow text-[#6e7079]">Listings ({detail.listings.length})</h3>
                {detail.listings.length > 0 && <div className="flex flex-wrap gap-2 rounded-[12px] border border-[#ecebe7] bg-[#f7f7f4] p-3"><span className="w-full font-display text-[13px] font-medium text-[#4a4c55]">Apply to all {detail.listings.length} of this owner’s listings</span><Button type="secondary" size="s" disabled={busy} onClick={() => void bulk('suspend')}>Suspend all</Button><Button type="secondary" size="s" disabled={busy} onClick={() => void bulk('restore')}>Restore all</Button><button type="button" disabled={busy} onClick={() => void bulk('delete')} className="inline-flex h-10 items-center rounded-[10px] border border-[#f1c9c4] bg-white px-3.5 font-display text-[14px] font-medium text-[#b42318] hover:bg-[#fdecea] disabled:opacity-50">Delete all</button></div>}
                {detail.listings.length ? <ul className="flex flex-col gap-2">{detail.listings.map((listing) => (
                  <li key={listing._id}><button type="button" onClick={() => onOpenBusiness(listing._id)} className="flex w-full items-center gap-3 rounded-[12px] border border-[#dcdbd5] p-3 text-left hover:border-[#002fa7]"><span className="min-w-0 flex-1"><span className="block truncate font-display text-[15px] font-semibold leading-5">{listing.name}</span><span className="block truncate text-[13px] leading-[18px] text-[#6e7079]">{[listing.category?.name, listing.address?.locality || listing.address?.city].filter(Boolean).join(' · ')} · {listing.viewCount || 0} views · {listing.leadCount || 0} inquiries</span></span><Badge tone={listing.listingStatus === 'published' ? 'live' : listing.listingStatus === 'pending_review' || listing.listingStatus === 'paused' ? 'pending' : 'closed'}>{LISTING_STATUS[listing.listingStatus] || listing.listingStatus}</Badge><ExternalLink size={16} className="shrink-0 text-[#6e7079]" aria-hidden="true" /></button></li>
                ))}</ul> : <p className="text-[14px] text-[#6e7079]">This owner hasn’t created a listing yet.</p>}
                
              </section>
            )}

            {(user.role === 'customer' || detail.reviews.length > 0) && (
              <section className="flex flex-col gap-3 border-t border-[#ecebe7] px-6 py-5">
                <h3 className="font-eyebrow text-[#6e7079]">Reviews written ({detail.reviews.length})</h3>
                {detail.reviews.length ? <ul className="flex flex-col gap-2">{detail.reviews.map((review) => (
                  <li key={review.id} className="rounded-[12px] border border-[#dcdbd5] p-3"><div className="flex items-center justify-between gap-2"><button type="button" onClick={() => onOpenBusiness(review.businessId)} className="truncate font-display text-[14px] font-semibold text-[#002fa7] hover:underline">{review.businessName}</button><span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold"><Star size={14} className="fill-[#002fa7] text-[#002fa7]" aria-hidden="true" />{review.rating}</span></div>{review.comment && <p className="mt-1 text-[14px] leading-5 text-[#4a4c55]">{review.comment}</p>}<p className="mt-1 text-[12px] text-[#6e7079]">{when(review.createdAt)}{review.reply ? ' · Owner replied' : ''}</p></li>
                ))}</ul> : <p className="text-[14px] text-[#6e7079]">No reviews yet.</p>}
              </section>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

function AddPersonDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const confirm = useConfirm();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'customer' | 'business_owner' | 'admin'>('business_owner');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid = name.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const submit = async () => {
    let pw: string | boolean = true;
    if (role === 'admin') { pw = await confirm({ title: `Create an admin account for ${name.trim()}?`, message: 'Admins can manage every listing, account and review. Only do this for someone you fully trust.', confirmLabel: 'Create admin', tone: 'danger', askPassword: true }); if (!pw) return; }
    setBusy(true); setError('');
    try { await createAdminUser({ name: name.trim(), email: email.trim(), role }, typeof pw === 'string' ? pw : undefined); onCreated(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to create the account'); setBusy(false); }
  };
  return (
    <div role="dialog" aria-modal="true" aria-label="Add a person" className="fixed inset-0 z-50 grid place-items-center bg-[#101115]/50 p-4" onClick={() => !busy && onClose()}>
      <div className="flex w-full max-w-[460px] flex-col gap-4 rounded-[20px] bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div><h2 className="text-[20px] font-semibold leading-7">Add a person</h2><p className="mt-1 text-[14px] leading-5 text-[#4a4c55]">They sign in with their email and a one-time code we send. No password is created or shared.</p></div>
        <label className="flex flex-col gap-1.5 text-[14px] font-medium">Full name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className={field + ' font-normal'} /></label>
        <label className="flex flex-col gap-1.5 text-[14px] font-medium">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} className={field + ' font-normal'} /></label>
        <label className="flex flex-col gap-1.5 text-[14px] font-medium">Account type<select value={role} onChange={(event) => setRole(event.target.value as 'customer' | 'business_owner' | 'admin')} className={field + ' font-normal'}><option value="business_owner">Business owner</option><option value="customer">Customer</option><option value="admin">Admin (super admin only)</option></select></label>
        {error && <p role="alert" className="rounded-[10px] bg-[#fdecea] px-3 py-2 text-[14px] text-[#8c1d13]">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="ghost" size="s" onClick={onClose} disabled={busy}>Cancel</Button><Button type="primary" size="s" onClick={() => void submit()} disabled={busy || !valid}>{busy ? 'Creating…' : 'Create account'}</Button></div>
      </div>
    </div>
  );
}
