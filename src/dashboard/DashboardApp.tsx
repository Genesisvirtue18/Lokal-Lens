"use client";

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole, OwnerTab, AdminTab, BusinessListing, Lead, Review } from './types';
import { addOwnerLeadNote, clearGooglePlaceMismatch, AdminStats, loadAdminDashboard, loadAdminStats, loadOwnerDashboard, logout, request, reviewBusiness, setListingVisibility, updateOwnerLeadStatus } from './api';
import { Header } from './components/Header';
import { OwnerDashboard } from './components/OwnerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { BottomNav } from './components/BottomNav';
import { OwnerTabs } from './components/OwnerTabs';
import { OwnerSidebar } from './components/OwnerSidebar';
import { OwnerTopBar } from './components/OwnerTopBar';
import { OwnerAccountTab, OwnerUser } from './components/OwnerAccountTab';
import { OwnerAnalyticsTab } from './components/OwnerAnalyticsTab';
import { OwnerOffersTab } from './components/OwnerOffersTab';
import AddBusinessWizard from '@/components/AddBusinessWizard';
import { PublicProfileModal } from './components/PublicProfileModal';
import { LeadDetailModal } from './components/LeadDetailModal';
import { ReplyReviewModal } from './components/ReplyReviewModal';
import { SearchModal } from './components/SearchModal';
import { OwnerLeadsTab } from './components/OwnerLeadsTab';
import { OwnerReviewsTab } from './components/OwnerReviewsTab';
import { AdminBusinessesTab } from './components/AdminBusinessesTab';
import { AdminSidebar } from './components/AdminSidebar';
import { useConfirm } from '@/components/ConfirmProvider';
import { AdminPeopleTab } from './components/AdminPeopleTab';
import { AdminReviewsTab } from './components/AdminReviewsTab';
import { AdminLeadsTab } from './components/AdminLeadsTab';
import { AdminReportsTab } from './components/AdminReportsTab';
import { AdminActivityTab } from './components/AdminActivityTab';
import { BusinessProfileForm } from './components/BusinessProfileForm';
import { CategoryManager } from './components/CategoryManager';

interface DashboardAppProps {
  role: UserRole;
  initialTab?: 'form';
}

export default function DashboardApp({ role, initialTab }: DashboardAppProps) {
  const router = useRouter();
  // Each route receives a fixed role. There is deliberately no role switcher.
  const [ownerTab, setOwnerTab] = useState<OwnerTab>(initialTab === 'form' ? 'form' : 'business');
  const [adminTab, setAdminTab] = useState<AdminTab>('overview');
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [ownerUser, setOwnerUser] = useState<OwnerUser | null>(null);
  const [formEditId, setFormEditId] = useState('');
  const [formStep, setFormStep] = useState(0);

  // Business state
  const [pendingBusinesses, setPendingBusinesses] = useState<BusinessListing[]>([]);
  const [activeBusinesses, setActiveBusinesses] = useState<BusinessListing[]>([]);

  // Leads & Reviews state
  const [ownerLeads, setOwnerLeads] = useState<Lead[]>([]);
  const [adminLeads] = useState<Lead[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let live = true;
    (async () => { try {
      setLoading(true); setLoadError('');
      if (role === 'admin') { loadAdminStats().then((value) => { if (live) setAdminStats(value); }).catch(() => {}); const items = await loadAdminDashboard(); if (live) { setPendingBusinesses(items.filter((item) => item.status === 'Pending')); setActiveBusinesses(items.filter((item) => item.status !== 'Pending')); } }
      else { const data = await loadOwnerDashboard(); if (live) { setActiveBusinesses(data.businesses); setReviews(data.reviews); setOwnerLeads(data.leads); } }
    } catch (error) { const message = error instanceof Error ? error.message : 'Unable to load dashboard data'; if (/not authorized|forbidden|permission/i.test(message)) { if (role === 'owner') { window.location.replace('/account'); return; } try { const me = await request('/auth/me'); window.location.replace(me.user?.role === 'business_owner' ? '/business-owner' : '/account'); return; } catch { /* fall through to the message */ } } if (live) setLoadError(message); } finally { if (live) setLoading(false); } })();
    return () => { live = false; };
  }, [role]);

  // The admin's own account page (password, two-step verification) needs the signed-in user too.
  useEffect(() => {
    if (role !== 'admin') return;
    request('/auth/me').then((data) => setOwnerUser(data.user || null)).catch(() => setOwnerUser(null));
  }, [role]);

  useEffect(() => {
    if (role !== 'owner') return;
    // Who is signed in, and (when opened as /add-business) which listing to edit.
    request('/auth/me').then((data) => setOwnerUser(data.user || null)).catch(() => setOwnerUser(null));
    if (initialTab === 'form') {
      const query = new URLSearchParams(window.location.search);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormEditId(query.get('edit') || ''); setFormStep(Math.max(0, Number(query.get('step') || 1) - 1));
    }
  }, [role, initialTab]);

  const reloadAdminList = async () => {
    try { const items = await loadAdminDashboard(); setPendingBusinesses(items.filter((item) => item.status === 'Pending')); setActiveBusinesses(items.filter((item) => item.status !== 'Pending')); } catch { /* keep what is on screen */ }
  };
  const reloadOwner = async () => {
    try { const data = await loadOwnerDashboard(); setActiveBusinesses(data.businesses); setReviews(data.reviews); setOwnerLeads(data.leads); } catch { /* keep what is on screen */ }
  };
  const onReviewChange = (reviewId: string, reply: { text: string; createdAt: string } | null) => setReviews((current) => current.map((review) => (review.id === reviewId ? { ...review, reply: reply?.text, replyDate: reply?.createdAt } : review)));
  const confirm = useConfirm();
  const toggleVisibility = async (business: BusinessListing) => {
    const pause = business.status === 'Active';
    if (!(await confirm(pause ? { title: `Pause “${business.name}”?`, message: 'It is hidden from search and from customers until you resume it. Your inquiries and reviews are kept.', confirmLabel: 'Pause listing', tone: 'warning' } : { title: `Make “${business.name}” live again?`, message: 'Customers can find it in search again.', confirmLabel: 'Go live', tone: 'primary' }))) return;
    try { await setListingVisibility(business.id, !pause); await reloadOwner(); showToast(pause ? 'Listing paused.' : 'Your listing is live again.'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Unable to change the listing.'); }
  };
  const deleteListing = async (business: BusinessListing) => {
    try { await request(`/owner/businesses/${business.id}`, { method: 'DELETE' }); await reloadOwner(); showToast(`“${business.name}” was deleted.`); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Unable to delete the listing.'); }
  };
  const openForm = (id = '', step = 0) => { setFormEditId(id); setFormStep(step); setOwnerTab('form'); window.scrollTo({ top: 0 }); };
  const doLogout = async () => { try { await logout(); } catch { /* Local credentials are cleared even if the API is unreachable. */ } finally { router.replace('/login'); router.refresh(); } };

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Modals state
  const [publicProfileBiz, setPublicProfileBiz] = useState<BusinessListing | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isBusinessFormOpen, setIsBusinessFormOpen] = useState(false);
  const [businessFormTargetId, setBusinessFormTargetId] = useState<string | undefined>(undefined);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [adminForm, setAdminForm] = useState<{ id: string } | null>(null);
  const [adminOpenId, setAdminOpenId] = useState('');
  const [adminPersonId, setAdminPersonId] = useState('');
  const openBusiness = (id: string) => { setAdminOpenId(id); setAdminTab('businesses'); };
  const openPerson = (id: string) => { setAdminPersonId(id); setAdminTab('people'); };

  // Handlers
  const handleApproveBusiness = async (bizId: string) => {
    const biz = pendingBusinesses.find((b) => b.id === bizId);
    if (!biz) return;
    try {
      const updated = await reviewBusiness(bizId, 'approve');
      setPendingBusinesses((prev) => prev.filter((b) => b.id !== bizId));
      setActiveBusinesses((prev) => [updated, ...prev.filter(item => item.id !== bizId)]);
      showToast(`"${biz.name}" approved and published.`);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to approve this listing'); }
  };

  const handleRejectBusiness = async (bizId: string, rejectionReason?: string) => {
    const biz = pendingBusinesses.find((b) => b.id === bizId);
    if (!biz) return;
    try {
      const rejected = await reviewBusiness(bizId, 'reject', rejectionReason);
      setPendingBusinesses((prev) => prev.filter((b) => b.id !== bizId));
      setActiveBusinesses((prev) => [rejected, ...prev.filter(item => item.id !== bizId)]);
      showToast(`Listing "${biz.name}" was rejected.`);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to reject this listing'); }
  };

  const handleClearGooglePlaceMismatch = async (bizId: string) => {
    try {
      const updated = await clearGooglePlaceMismatch(bizId);
      setPendingBusinesses(prev => prev.map(item => item.id === bizId ? updated : item));
      setActiveBusinesses(prev => prev.map(item => item.id === bizId ? updated : item));
      showToast(`Mismatched Google Place ID cleared for "${updated.name}".`);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to clear the mismatched Google Place ID'); }
  };

  const handleEditBusiness = (business: BusinessListing = primaryOwnerBusiness) => {
    // Owners edit in the same form they used to add the business; admins keep the admin form.
    if (role === 'owner' && business?.id) { openForm(business.id); return; }
    setBusinessFormTargetId(business?.id);
    setIsBusinessFormOpen(true);
  };

  const handleAddBusiness = () => {
    if (role === 'owner') { openForm(''); return; }
    setBusinessFormTargetId(undefined);
    setIsBusinessFormOpen(true);
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: Lead['status']) => {
    try { await updateOwnerLeadStatus(leadId, newStatus); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Unable to update inquiry status'); return; }
    setOwnerLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    showToast(`Lead status updated to "${newStatus}"`);
  };

  const handleAddLeadNote = async (leadId: string, note: string) => {
    try { await addOwnerLeadNote(leadId, note); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Unable to save follow-up note'); return; }
    const updater = (prev: Lead[]) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, notes: [...(l.notes || []), note] } : l
      );
    setOwnerLeads(updater);
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) =>
        prev ? { ...prev, notes: [...(prev.notes || []), note] } : null
      );
    }
    showToast('Follow-up note added to CRM log');
  };

  // An answer to a customer's inquiry (shown in their My account, and emailed when they gave an address).
  const handleReplyToLead = async (leadId: string, text: string) => {
    try {
      await request(`/owner/leads/${leadId}/reply`, { method: 'POST', body: JSON.stringify({ text }) });
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to send the reply'); throw error; }
    const apply = (lead: Lead): Lead => lead.id === leadId ? { ...lead, status: lead.status === 'New' ? 'Contacted' : lead.status, replies: [...(lead.replies || []), { text }] } : lead;
    setOwnerLeads((items) => items.map(apply));
    setSelectedLead((current) => current && current.id === leadId ? apply(current) : current);
    showToast('Reply sent to the customer.');
  };

  const handleSubmitReply = (reviewId: string, replyText: string) => {
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              reply: replyText,
              replyDate: 'Today',
            }
          : r
      )
    );
    showToast('✓ Official response published to patient review!');
  };

  const primaryOwnerBusiness = activeBusinesses[0];

  return (
    <div className="min-h-screen bg-[#f1f1ee] text-[#101115]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 z-50 px-4 py-2.5 rounded-xl bg-[#002fa7] text-white text-[13px] font-semibold shadow-xl border border-[#bdbcb5]/40 flex items-center gap-2 animate-slide-down">
          <span className="material-symbols-outlined text-emerald-400 text-lg">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Responsive App Frame Container */}
      <div className="flex min-h-screen w-full">
        {role === 'owner' && <OwnerSidebar active={ownerTab === 'form' && formEditId ? 'business' : ownerTab} onSelect={setOwnerTab} newLeads={ownerLeads.filter((lead) => lead.status === 'New').length} reviewCount={reviews.filter((review) => !review.reply).length} onAddBusiness={handleAddBusiness} onLogout={doLogout} />}
        {role === 'admin' && <AdminSidebar active={adminTab} onSelect={(tab) => { setAdminForm(null); setAdminTab(tab); }} waiting={pendingBusinesses.length} reports={(adminStats?.openReports || 0) + (adminStats?.pendingClaims || 0)} onLogout={doLogout} />}
      <div className="min-w-0 flex-1 bg-[#f1f1ee]">
        {/* Top App Bar Component */}
        <Header
          role={role}
          onLogout={doLogout}
          unreadNotificationsCount={0}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenNotifications={() => showToast('Notifications are not available from the current API.')}
          onOpenProfileMenu={() => {
            if (role === 'owner') {
              setPublicProfileBiz(primaryOwnerBusiness);
            } else {
              showToast('Business listings are created by business owners.');
            }
          }}
          onOpenMobileMenu={() => setAdminTab('businesses')}
          onAddBusiness={handleAddBusiness}
        />

        {role === 'owner' && <OwnerTopBar user={ownerUser} tab={ownerTab} leads={ownerLeads} reviews={reviews} onGoReviews={() => setOwnerTab('reviews')} onOpenLead={(lead) => setSelectedLead(lead)} onGoLeads={() => setOwnerTab('leads')} onAccount={() => setOwnerTab('settings')} onLogout={doLogout} />}
        {role === 'owner' && !loading && !loadError && <OwnerTabs active={ownerTab} onSelect={setOwnerTab} newLeads={ownerLeads.filter((lead) => lead.status === 'New').length} reviewCount={reviews.length} />}
        {/* Dashboard Content per Role and Sub-Tab */}
        <div className="flex-1">
          {loading ? (
            <div className="mx-auto max-w-7xl px-6 py-10 text-sm text-[#4a4c55]">Loading dashboard data…</div>
          ) : loadError ? (
            (() => {
              const wrongAccount = /not authorized|forbidden|permission/i.test(loadError);
              return (
                <div className="mx-auto flex max-w-[520px] flex-col items-center gap-4 px-6 py-16 text-center">
                  <h1 className="text-[24px] font-semibold leading-8">{wrongAccount ? 'This area is for business owners' : 'We couldn’t load your dashboard'}</h1>
                  <p className="text-[16px] leading-6 text-[#4a4c55]">{wrongAccount ? 'You’re signed in with a customer account. Sign in with your business owner account, or create one to list your business.' : 'Check your internet connection and try again. If it keeps happening, sign in again.'}</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {!wrongAccount && <button type="button" onClick={() => window.location.reload()} className="h-11 rounded-[10px] bg-[#002fa7] px-5 font-display text-[15px] font-semibold text-white">Try again</button>}
                    <button type="button" onClick={() => void doLogout()} className={wrongAccount ? 'h-11 rounded-[10px] bg-[#002fa7] px-5 font-display text-[15px] font-semibold text-white' : 'h-11 rounded-[10px] border border-[#bdbcb5] bg-white px-5 font-display text-[15px] font-semibold'}>{wrongAccount ? 'Sign in as business owner' : 'Sign in again'}</button>
                    <Link href="/directory" className="inline-flex h-11 items-center rounded-[10px] border border-[#bdbcb5] bg-white px-5 font-display text-[15px] font-semibold">Browse directory</Link>
                  </div>
                </div>
              );
            })()
          ) : role === 'owner' && ownerTab === 'form' ? (
            <AddBusinessWizard key={formEditId || 'new'} embedded editId={formEditId} initialStep={formStep} onExit={() => setOwnerTab('business')} onSaved={reloadOwner} />
          ) : role === 'owner' && ownerTab === 'settings' ? (
            <OwnerAccountTab user={ownerUser} onUserChange={setOwnerUser} onLogout={doLogout} showToast={showToast} />
          ) : role === 'owner' && !primaryOwnerBusiness ? (
            <main className="mx-auto max-w-[1440px] px-4 py-12 md:px-8 lg:px-12 xl:px-[72px]"><p className="text-[12px] text-[#002fa7]">Owner dashboard</p><h2 className="mt-2 text-4xl font-semibold">Your listings</h2><p className="mt-2 text-sm text-[#4a4c55]">Add a business to help local customers find and contact you.</p><button onClick={handleAddBusiness} className="mt-5 rounded-xl bg-[#002fa7] px-5 py-3 text-sm font-semibold text-white">Add your business</button></main>
          ) : role === 'owner' ? (
            ownerTab === 'business' ? (
              <OwnerDashboard
                businesses={activeBusinesses}
                leads={ownerLeads}
                reviews={reviews}
                onOpenPublicProfile={(business) => router.push(`/business-owner/preview/${business.id}`)}
                onOpenCompleteProfile={handleEditBusiness}
                onEditAtStep={(business, step) => openForm(business.id, step)}
                onToggleVisibility={toggleVisibility}
                onDeleteBusiness={deleteListing}
                onAddBusiness={handleAddBusiness}
                onSelectLead={(l) => setSelectedLead(l)}
                onOpenReplyReview={(r) => setSelectedReview(r)}
                onViewAllLeads={() => setOwnerTab('leads')}
                showToast={showToast}
              />
            ) : ownerTab === 'leads' ? (
              <OwnerLeadsTab
                leads={ownerLeads}
                onSelectLead={(l) => setSelectedLead(l)}
                onBackToDashboard={() => setOwnerTab('business')}
                onStatusChange={handleUpdateLeadStatus}
              />
            ) : ownerTab === 'reviews' ? (
              <OwnerReviewsTab reviews={reviews} businesses={activeBusinesses} onReviewChange={onReviewChange} showToast={showToast} />
            ) : ownerTab === 'offers' ? (
              <OwnerOffersTab businesses={activeBusinesses} onChanged={reloadOwner} showToast={showToast} />
            ) : ownerTab === 'analytics' ? (
              <OwnerAnalyticsTab businesses={activeBusinesses} />
            ) : (
              <OwnerAccountTab user={ownerUser} onUserChange={setOwnerUser} onLogout={doLogout} showToast={showToast} />
            )
          ) : (
            // Admin View
            adminForm ? (
              <AddBusinessWizard key={adminForm.id || 'new'} embedded admin editId={adminForm.id} onExit={() => setAdminForm(null)} onSaved={reloadAdminList} />
            ) : adminTab === 'overview' ? (
              <AdminDashboard
                pendingBusinesses={pendingBusinesses}
                activeBusinesses={activeBusinesses}
                adminLeads={adminLeads}
                onApproveBusiness={handleApproveBusiness}
                onRejectBusiness={handleRejectBusiness}
                stats={adminStats}
                onInspectBusiness={(b) => openBusiness(b.id)}
                onGoTo={(tab) => setAdminTab(tab)}
                onOpenAddCategory={() => showToast('Category creation is not available from the current API.')}
                onExportData={() => showToast('Export is not available from the current API.')}
                onSelectLead={(l) => setSelectedLead(l)}
                onViewAllPending={() => setAdminTab('businesses')}
              />
            ) : adminTab === 'businesses' ? (
              <AdminBusinessesTab
                activeBusinesses={activeBusinesses}
                pendingBusinesses={pendingBusinesses}
                onApproveBusiness={handleApproveBusiness}
                onRejectBusiness={handleRejectBusiness}
                onClearGooglePlaceMismatch={handleClearGooglePlaceMismatch}
                onReload={() => void reloadAdminList()}
                onToast={showToast}
                onCreate={() => setAdminForm({ id: '' })}
                onEdit={(business) => setAdminForm({ id: business.id })}
                openId={adminOpenId}
                onClose={() => setAdminOpenId('')}
                onBusinessRemoved={(id) => { setPendingBusinesses((items) => items.filter((item) => item.id !== id)); setActiveBusinesses((items) => items.filter((item) => item.id !== id)); showToast('Listing deleted.'); }}
                onBusinessesImported={(businesses) => {
                  const importedIds = new Set(businesses.map(item => item.id));
                  setPendingBusinesses((items) => [...businesses.filter(item => item.status === 'Pending'), ...items.filter(item => !importedIds.has(item.id))]);
                  setActiveBusinesses((items) => [...businesses.filter(item => item.status !== 'Pending'), ...items.filter(item => !importedIds.has(item.id))]);
                  if (businesses.length) showToast(`${businesses.length} business${businesses.length === 1 ? '' : 'es'} submitted for admin review.`);
                }}
                onBusinessUpdated={(business) => {
                  setPendingBusinesses(items => business.status === 'Pending' ? [business, ...items.filter(item => item.id !== business.id)] : items.filter(item => item.id !== business.id));
                  setActiveBusinesses(items => business.status !== 'Pending' ? [business, ...items.filter(item => item.id !== business.id)] : items.filter(item => item.id !== business.id));
                }}
              />
            ) : adminTab === 'people' ? (
              <AdminPeopleTab openId={adminPersonId} onCloseOpen={() => setAdminPersonId('')} onOpenBusiness={openBusiness} onListingsChanged={() => void reloadAdminList()} showToast={showToast} />
            ) : adminTab === 'reports' ? (
              <AdminReportsTab openReports={adminStats?.openReports || 0} openListingReports={adminStats?.openListingReports || 0} pendingClaims={adminStats?.pendingClaims || 0} onChanged={() => void loadAdminStats().then(setAdminStats).catch(() => {})} onOpenBusiness={openBusiness} onOpenPerson={openPerson} showToast={showToast} />
            ) : adminTab === 'account' ? (
              <OwnerAccountTab user={ownerUser} onUserChange={setOwnerUser} onLogout={doLogout} showToast={showToast} />
            ) : adminTab === 'activity' ? (
              <AdminActivityTab onOpenBusiness={openBusiness} onOpenPerson={openPerson} />
            ) : adminTab === 'reviews' ? (
              <AdminReviewsTab onOpenBusiness={openBusiness} onOpenPerson={openPerson} showToast={showToast} />
            ) : adminTab === 'leads' ? (
              <AdminLeadsTab onOpenBusiness={openBusiness} onOpenPerson={openPerson} />
            ) : (
              <CategoryManager onMessage={showToast} />
            )
          )}
        </div>

        {/* Bottom Navigation Bar */}
        <BottomNav
          role={role}
          ownerTab={ownerTab}
          adminTab={adminTab}
          onSelectOwnerTab={(t) => setOwnerTab(t)}
          onSelectAdminTab={(t) => setAdminTab(t)}
          leadsCount={ownerLeads.length}
          newLeads={ownerLeads.filter((lead) => lead.status === 'New').length}
        />
      </div>
      </div>

      {/* Modals & Slide-overs */}
      <PublicProfileModal
        isOpen={!!publicProfileBiz}
        onClose={() => setPublicProfileBiz(null)}
        business={publicProfileBiz || primaryOwnerBusiness!}
      />

      <LeadDetailModal
        lead={selectedLead}
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdateStatus={handleUpdateLeadStatus}
        onAddNote={handleAddLeadNote}
        onReply={role === 'owner' ? handleReplyToLead : undefined}
      />

      <ReplyReviewModal
        review={selectedReview}
        isOpen={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        onSubmitReply={handleSubmitReply}
      />

      {isBusinessFormOpen && role === 'owner' && <BusinessProfileForm businessId={businessFormTargetId} onClose={() => setIsBusinessFormOpen(false)} onSaved={(business, created) => { setActiveBusinesses((items) => created ? [business, ...items] : items.map((item) => item.id === business.id ? business : item)); setIsBusinessFormOpen(false); setBusinessFormTargetId(undefined); showToast(created ? `"${business.name}" was submitted for admin review.` : 'Business profile saved.'); }} />}

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        businesses={[...activeBusinesses, ...pendingBusinesses]}
        leads={[...ownerLeads, ...adminLeads]}
        onSelectBusiness={(b) => setPublicProfileBiz(b)}
        onSelectLead={(l) => setSelectedLead(l)}
      />
    </div>
  );
}
