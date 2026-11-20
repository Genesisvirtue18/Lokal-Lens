"use client";

import Link from 'next/link';
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, LayoutDashboard, LogOut, MapPin, MessageSquare, Phone, Search, Settings, Star, Trash2 } from 'lucide-react';
import { Badge, Button, Logo, cx } from '@/components/ds';
import { useConfirm } from '@/components/ConfirmProvider';
import { optimizedImage } from '@/lib/images';
import { logout, request } from './api';
import { OwnerAccountTab, OwnerUser } from './components/OwnerAccountTab';

type Tab = 'overview' | 'saved' | 'reviews' | 'inquiries' | 'account';
type SavedBusiness = { _id: string; name: string; slug?: string; category?: { name?: string }; address?: { city?: string; locality?: string }; images?: string[]; logo?: string; averageRating?: number; reviewCount?: number; verificationStatus?: string; phone?: string };
type MyReview = { id: string; businessId: string; businessName: string; slug?: string; live: boolean; area: string; rating: number; comment: string; createdAt?: string; reply: { text: string; createdAt?: string } | null };
type MyInquiry = { id: string; service: string; message: string; status: 'new' | 'contacted' | 'converted'; withdrawn?: boolean; replies?: { text: string; createdAt?: string }[]; createdAt?: string; business: { id: string; name: string; slug?: string; phone?: string; city?: string; live: boolean } | null };

const SAVED_KEY = 'lokal-lens-saved-businesses';
const TABS: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'saved', label: 'Saved', icon: Heart },
  { id: 'reviews', label: 'My reviews', icon: Star },
  { id: 'inquiries', label: 'My inquiries', icon: MessageSquare },
  { id: 'account', label: 'Account', icon: Settings },
];
const STATUS: Record<MyInquiry['status'], { label: string; tone: 'pending' | 'live' | 'verified' }> = { new: { label: 'Sent', tone: 'pending' }, contacted: { label: 'Business responded', tone: 'verified' }, converted: { label: 'Completed', tone: 'live' } };

const when = (value?: string) => { try { return new Date(value || '').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };
const listingHref = (slug?: string) => slug ? `/directory/${slug}` : '/directory';
const Stars = ({ value }: { value: number }) => <span className="inline-flex gap-0.5" role="img" aria-label={`${value} out of 5`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={16} className={n <= value ? 'fill-[#101115] text-[#101115]' : 'text-[#bdbcb5]'} aria-hidden="true" />)}</span>;

function Empty({ icon: Icon, title, text, action }: { icon: React.ComponentType<{ size?: number }>; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[460px] flex-col items-center gap-3 rounded-[20px] border border-[#dcdbd5] bg-white px-6 py-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-[#f1f1ee] text-[#002fa7]"><Icon size={24} /></span>
      <h2 className="text-[20px] font-semibold leading-7">{title}</h2>
      <p className="text-[15px] leading-6 text-[#4a4c55]">{text}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

function SavedCard({ business, onRemove }: { business: SavedBusiness; onRemove: () => void }) {
  const photo = business.images?.[0] || business.logo;
  const place = [business.address?.locality, business.address?.city].filter(Boolean).join(', ');
  return (
    <article className="flex flex-col overflow-hidden rounded-[16px] border border-[#dcdbd5] bg-white">
      <Link href={listingHref(business.slug)} className="relative block aspect-[16/9] bg-[#e4e3de]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photo ? <img src={optimizedImage(photo, 560)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : <span className="absolute inset-0 grid place-items-center text-[#6e7079]"><MapPin size={28} aria-hidden="true" /></span>}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={listingHref(business.slug)} className="text-[17px] font-semibold leading-6 hover:text-[#002fa7]">{business.name}</Link>
          {business.verificationStatus === 'verified' && <Badge tone="verified">Verified</Badge>}
        </div>
        <p className="text-[14px] leading-5 text-[#4a4c55]">{[business.category?.name, place].filter(Boolean).join(' · ')}</p>
        {business.reviewCount ? <p className="flex items-center gap-1.5 text-[14px] text-[#4a4c55]"><Star size={15} className="fill-[#101115] text-[#101115]" aria-hidden="true" /><span className="font-medium text-[#101115]">{Number(business.averageRating || 0).toFixed(1)}</span>({business.reviewCount})</p> : <p className="text-[14px] text-[#6e7079]">No reviews yet</p>}
        <div className="mt-auto flex gap-2 pt-2">
          {business.phone && <a href={`tel:${business.phone}`} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] bg-[#002fa7] font-display text-[14px] font-medium text-white hover:bg-[#00268a]"><Phone size={16} aria-hidden="true" />Call</a>}
          <Link href={listingHref(business.slug)} className="inline-flex h-10 flex-1 items-center justify-center rounded-[10px] border border-[#bdbcb5] font-display text-[14px] font-medium hover:border-[#101115]">View</Link>
          <button type="button" onClick={onRemove} aria-label={`Remove ${business.name} from saved`} title="Remove from saved" className="grid h-10 w-10 place-items-center rounded-[10px] border border-[#bdbcb5] text-[#002fa7] hover:border-[#101115]"><Heart size={18} className="fill-[#002fa7]" aria-hidden="true" /></button>
        </div>
      </div>
    </article>
  );
}

export default function CustomerApp() {
  const router = useRouter();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>('overview');
  const [user, setUser] = useState<OwnerUser | null>(null);
  const [saved, setSaved] = useState<SavedBusiness[]>([]);
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [inquiries, setInquiries] = useState<MyInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState('');

  const showToast = useCallback((message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3500); }, []);

  // Keep this device's heart icons in step with the account.
  const mirrorSaved = (items: SavedBusiness[]) => {
    try {
      const records = [...items].reverse().map((item) => ({ id: item._id, name: item.name, href: listingHref(item.slug), category: item.category?.name, area: item.address?.locality, city: item.address?.city, image: item.images?.[0] || item.logo, verified: item.verificationStatus === 'verified', phone: item.phone }));
      localStorage.setItem(SAVED_KEY, JSON.stringify(records));
      window.dispatchEvent(new Event('lokal-saved-businesses-change'));
    } catch { /* storage can be blocked */ }
  };

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const me = await request('/auth/me');
      if (['admin', 'super_admin'].includes(me.user?.role)) { window.location.replace('/admin'); return; }
      if (me.user?.role === 'business_owner') { window.location.replace('/business-owner'); return; }
      setUser(me.user || null);
      // Businesses saved on this device before signing in are added to the account once.
      try { const local = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]').map((item: { id?: string }) => item?.id).filter((id: unknown) => typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id as string)); if (local.length) await request('/users/me/saved/sync', { method: 'POST', body: JSON.stringify({ ids: local.slice(0, 60) }) }); } catch { /* sync is best-effort */ }
      const [s, r, i] = await Promise.all([request('/users/me/saved'), request('/users/me/reviews'), request('/users/me/inquiries')]);
      setSaved(s.items || []); setReviews(r.items || []); setInquiries(i.items || []);
      mirrorSaved(s.items || []);
    } catch (error) { setLoadError(error instanceof Error ? error.message : 'Unable to load your account'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('tab') as Tab | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (wanted && TABS.some((item) => item.id === wanted)) setTab(wanted);
    void load();
  }, [load]);

  const choose = (next: Tab) => { setTab(next); window.scrollTo({ top: 0 }); };
  const doLogout = async () => { try { await logout(); } catch { /* local credentials are cleared anyway */ } router.replace('/login'); router.refresh(); };

  const removeSaved = async (business: SavedBusiness) => {
    const before = saved;
    const next = saved.filter((item) => item._id !== business._id);
    setSaved(next); mirrorSaved(next);
    try { await request(`/users/me/saved/${business._id}`, { method: 'DELETE' }); showToast(`Removed “${business.name}” from saved.`); }
    catch (error) { setSaved(before); mirrorSaved(before); showToast(error instanceof Error ? error.message : 'Unable to remove it'); }
  };

  const withdrawInquiry = async (item: MyInquiry) => {
    if (!(await confirm({ title: 'Withdraw this inquiry?', message: `${item.business?.name || 'The business'} will see that you withdrew it and can no longer reply.`, confirmLabel: 'Withdraw', tone: 'warning' }))) return;
    try { await request(`/users/me/inquiries/${item.id}`, { method: 'DELETE' }); setInquiries((items) => items.map((row) => row.id === item.id ? { ...row, withdrawn: true } : row)); showToast('Inquiry withdrawn.'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Unable to withdraw the inquiry'); }
  };

  const deleteReview = async (review: MyReview) => {
    if (!(await confirm({ title: 'Delete your review?', message: `Your ${review.rating}-star review of “${review.businessName}” will be removed. You can write a new one later.`, confirmLabel: 'Delete review', tone: 'danger' }))) return;
    try { await request(`/users/me/reviews/${review.businessId}`, { method: 'DELETE' }); setReviews((items) => items.filter((item) => item.id !== review.id)); showToast('Your review was deleted.'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Unable to delete the review'); }
  };

  const first = (user?.name || '').split(/\s+/)[0];
  const answered = inquiries.filter((item) => item.status !== 'new').length;
  const linkClass = 'flex h-11 items-center gap-3 rounded-[10px] px-3 font-display text-[15px] font-medium text-[#4a4c55] hover:bg-[#f1f1ee] hover:text-[#101115]';

  const body = () => {
    if (loading) return <p className="text-[15px] text-[#4a4c55]">Loading your account…</p>;
    if (loadError) return <div className="flex flex-col items-start gap-3"><p className="text-[16px] text-[#b42318]">{loadError}</p><Button type="primary" size="s" onClick={() => void load()}>Try again</Button></div>;

    if (tab === 'account') return <OwnerAccountTab user={user} onUserChange={setUser} onLogout={doLogout} showToast={showToast} />;

    if (tab === 'saved') return saved.length === 0
      ? <Empty icon={Heart} title="Nothing saved yet" text="Tap the heart on any business to keep it here, on every device you sign in from." action={<Button type="primary" href="/directory">Explore businesses</Button>} />
      : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{saved.map((business) => <SavedCard key={business._id} business={business} onRemove={() => void removeSaved(business)} />)}</div>;

    if (tab === 'reviews') return reviews.length === 0
      ? <Empty icon={Star} title="You haven’t reviewed anyone yet" text="Reviews you write appear here. Your feedback helps other people choose and helps businesses improve." action={<Button type="primary" href="/directory">Find a business to review</Button>} />
      : <ul className="flex flex-col gap-4">{reviews.map((review) => (
        <li key={review.id} className="flex flex-col gap-3 rounded-[16px] border border-[#dcdbd5] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><Link href={listingHref(review.slug)} className="text-[17px] font-semibold leading-6 hover:text-[#002fa7]">{review.businessName}</Link>{review.area && <p className="text-[14px] text-[#6e7079]">{review.area}</p>}</div>
            <div className="flex items-center gap-3"><Stars value={review.rating} /><span className="text-[13px] text-[#6e7079]">{when(review.createdAt)}</span></div>
          </div>
          {review.comment ? <p className="text-[15px] leading-6 text-[#101115]">{review.comment}</p> : <p className="text-[14px] italic text-[#6e7079]">Rating only, no comment.</p>}
          {review.reply && <div className="rounded-[12px] bg-[#f7f7f4] p-3.5"><p className="text-[13px] font-medium text-[#4a4c55]">Reply from the business</p><p className="mt-1 text-[14px] leading-5">{review.reply.text}</p></div>}
          {!review.live && <p className="text-[13px] text-[#6e7079]">This listing is currently not public.</p>}
          <div className="flex flex-wrap gap-2">
            {review.live && <Link href={`${listingHref(review.slug)}#customer-reviews`} className="inline-flex h-9 items-center rounded-[10px] border border-[#bdbcb5] px-3.5 font-display text-[14px] font-medium hover:border-[#101115]">Edit review</Link>}
            <button type="button" onClick={() => void deleteReview(review)} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3 font-display text-[14px] font-medium text-[#b42318] hover:bg-[#fff6f5]"><Trash2 size={16} aria-hidden="true" />Delete</button>
          </div>
        </li>
      ))}</ul>;

    if (tab === 'inquiries') return inquiries.length === 0
      ? <Empty icon={MessageSquare} title="No inquiries yet" text="When you send an inquiry to a business while signed in, you can follow it here. Inquiries sent before you signed in aren’t linked to your account." action={<Button type="primary" href="/directory">Explore businesses</Button>} />
      : <ul className="flex flex-col gap-4">{inquiries.map((item) => (
        <li key={item.id} className="flex flex-col gap-3 rounded-[16px] border border-[#dcdbd5] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>{item.business ? <Link href={listingHref(item.business.slug)} className="text-[17px] font-semibold leading-6 hover:text-[#002fa7]">{item.business.name}</Link> : <span className="text-[17px] font-semibold">Business removed</span>}<p className="text-[14px] text-[#6e7079]">{[item.service, when(item.createdAt)].filter(Boolean).join(' · ')}</p></div>
            {item.withdrawn ? <Badge tone="closed">Withdrawn</Badge> : <Badge tone={STATUS[item.status].tone}>{STATUS[item.status].label}</Badge>}
          </div>
          <p className="whitespace-pre-line rounded-[12px] bg-[#f7f7f4] p-3.5 text-[14px] leading-5">{item.message}</p>
          {(item.replies || []).map((reply, index) => <div key={index} className="rounded-[12px] border border-[#cfd9f3] bg-[#f3f6fd] p-3.5"><p className="text-[13px] font-medium text-[#002fa7]">Reply from {item.business?.name || 'the business'}{reply.createdAt ? ` · ${when(reply.createdAt)}` : ''}</p><p className="mt-1 whitespace-pre-line text-[14px] leading-5">{reply.text}</p></div>)}
          {!item.withdrawn && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void withdrawInquiry(item)} className="inline-flex h-9 items-center rounded-[10px] px-3 font-display text-[14px] font-medium text-[#b42318] hover:bg-[#fff6f5]">Withdraw</button></div>}
          {item.business?.live && item.business.phone && <div><a href={`tel:${item.business.phone}`} className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#bdbcb5] px-3.5 font-display text-[14px] font-medium hover:border-[#101115]"><Phone size={16} aria-hidden="true" />Call {item.business.name}</a></div>}
        </li>
      ))}</ul>;

    // overview
    const tiles: { id: Tab; label: string; value: number; hint: string; icon: React.ComponentType<{ size?: number }> }[] = [
      { id: 'saved', label: 'Saved businesses', value: saved.length, hint: 'Kept for later', icon: Heart },
      { id: 'reviews', label: 'Reviews written', value: reviews.length, hint: reviews.some((r) => r.reply) ? `${reviews.filter((r) => r.reply).length} with a reply` : 'Helping others choose', icon: Star },
      { id: 'inquiries', label: 'Inquiries sent', value: inquiries.length, hint: inquiries.length ? `${answered} answered` : 'Contact a business', icon: MessageSquare },
    ];
    return (
      <div className="flex flex-col gap-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {tiles.map(({ id, label, value, hint, icon: Icon }) => (
            <button key={id} type="button" onClick={() => choose(id)} className="flex flex-col gap-3 rounded-[16px] border border-[#dcdbd5] bg-white p-5 text-left transition-colors hover:border-[#002fa7]">
              <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-[#e6ebf7] text-[#002fa7]"><Icon size={20} /></span>
              <span><span className="block text-[32px] font-semibold leading-9 tabular-nums">{value}</span><span className="block text-[15px] font-medium">{label}</span><span className="block text-[13px] text-[#6e7079]">{hint}</span></span>
            </button>
          ))}
        </div>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between"><h2 className="text-[18px] font-semibold">Recent inquiries</h2>{inquiries.length > 3 && <button type="button" onClick={() => choose('inquiries')} className="text-[14px] font-medium text-[#002fa7] hover:underline">View all</button>}</div>
          {inquiries.length === 0
            ? <p className="rounded-[16px] border border-dashed border-[#bdbcb5] p-5 text-[15px] text-[#4a4c55]">You haven’t contacted any business yet. Find one and send an inquiry. It’ll show up here with its status.</p>
            : <ul className="flex flex-col divide-y divide-[#ecebe7] rounded-[16px] border border-[#dcdbd5] bg-white">{inquiries.slice(0, 3).map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5"><span><span className="block text-[15px] font-medium">{item.business?.name || 'Business removed'}</span><span className="block text-[13px] text-[#6e7079]">{[item.service, when(item.createdAt)].filter(Boolean).join(' · ')}</span></span><Badge tone={STATUS[item.status].tone}>{STATUS[item.status].label}</Badge></li>)}</ul>}
        </section>

        {saved.length > 0 && <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between"><h2 className="text-[18px] font-semibold">Saved for later</h2>{saved.length > 3 && <button type="button" onClick={() => choose('saved')} className="text-[14px] font-medium text-[#002fa7] hover:underline">View all</button>}</div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{saved.slice(0, 3).map((business) => <SavedCard key={business._id} business={business} onRemove={() => void removeSaved(business)} />)}</div>
        </section>}

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-[#e6ebf7] p-5">
          <div><h2 className="text-[17px] font-semibold">Run a business?</h2><p className="text-[14px] text-[#4a4c55]">List it for free and get inquiries from local customers.</p></div>
          <Button type="primary" size="s" href="/register?next=/add-business">List your business</Button>
        </section>
      </div>
    );
  };

  const title = tab === 'overview' ? (first ? `Hi, ${first}` : 'Your account') : TABS.find((item) => item.id === tab)?.label;
  return (
    <div className="min-h-screen bg-[#f1f1ee] text-[#101115]">
      {toast && <div role="status" className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl bg-[#101115] px-4 py-2.5 text-[14px] font-medium text-white shadow-xl">{toast}</div>}
      <div className="flex min-h-screen w-full">
        <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-[#dcdbd5] bg-white lg:flex" aria-label="Account navigation">
          <div className="flex h-16 shrink-0 items-center border-b border-[#dcdbd5] px-5"><Link href="/" aria-label="Lokal Lens home"><Logo /></Link></div>
          <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
            <p className="px-3 pb-1 pt-2 font-eyebrow text-[#6e7079]">My account</p>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => choose(id)} aria-current={tab === id ? 'page' : undefined} className={cx('flex h-11 items-center gap-3 rounded-[10px] px-3 text-left font-display text-[15px] font-medium transition-colors', tab === id ? 'bg-[#e6ebf7] text-[#002fa7]' : 'text-[#4a4c55] hover:bg-[#f1f1ee] hover:text-[#101115]')}>
                <Icon size={20} /><span className="flex-1">{label}</span>
                {id === 'saved' && saved.length > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#e4e3de] px-1.5 text-[12px] font-semibold text-[#4a4c55]">{saved.length}</span>}
              </button>
            ))}
            <p className="px-3 pb-1 pt-5 font-eyebrow text-[#6e7079]">Discover</p>
            <Link href="/directory" className={linkClass}><Search size={20} />Browse directory</Link>
            <Link href="/offers" className={linkClass}><MapPin size={20} />Offers near you</Link>
          </nav>
          <div className="shrink-0 border-t border-[#dcdbd5] p-3">
            <button type="button" onClick={() => void doLogout()} className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[#f1c9c4] bg-[#fff6f5] font-display text-[15px] font-semibold text-[#b42318] hover:bg-[#fde8e5]"><LogOut size={20} />Log out</button>
          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-24 lg:pb-0">
          <header className="sticky top-0 z-40 flex h-16 lg:hidden items-center justify-between gap-3 border-b border-[#dcdbd5] bg-[#f1f1ee]/95 px-4 backdrop-blur md:px-8 lg:px-12">
            <Link href="/" aria-label="Lokal Lens home" className="lg:hidden"><Logo /></Link>
            <div className="ml-auto flex items-center gap-2">
              <Link href="/" className="hidden h-10 items-center px-3 font-display text-[14px] font-medium hover:text-[#002fa7] sm:inline-flex">View site</Link>
              <button type="button" onClick={() => void doLogout()} className="inline-flex h-10 items-center gap-1.5 rounded-[10px] px-3 font-display text-[14px] font-medium text-[#4a4c55] hover:bg-white lg:hidden"><LogOut size={18} aria-hidden="true" />Log out</button>
            </div>
          </header>
          <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-6 px-4 py-8 md:px-8 lg:px-12">
            <div><p className="font-eyebrow text-[#002fa7]">My account</p><h1 className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-[34px] md:leading-10">{title}</h1></div>
            {body()}
          </div>
        </div>
      </div>

      <nav aria-label="Account sections" className="fixed bottom-0 left-0 z-50 grid w-full grid-cols-5 border-t border-[#dcdbd5] bg-white px-1 pb-[max(4px,env(safe-area-inset-bottom))] pt-1 shadow-md lg:hidden">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => choose(id)} aria-current={tab === id ? 'page' : undefined} className={cx('flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-[10px] text-[11px] font-medium leading-4', tab === id ? 'bg-[#e8edfb] text-[#002fa7]' : 'text-[#4a4c55]')}><Icon size={20} />{label === 'My reviews' ? 'Reviews' : label === 'My inquiries' ? 'Inquiries' : label}</button>
        ))}
      </nav>
    </div>
  );
}
