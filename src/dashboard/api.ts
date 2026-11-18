import { BusinessListing, Lead, Review } from './types';

type ApiReview = {
  _id?: string;
  reviewerName?: string;
  rating?: number | string;
  createdAt?: string;
  comment?: string;
  isVerified?: boolean;
  reply?: { text?: string; createdAt?: string };
};

type ApiLead = {
  _id?: string;
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  service?: string;
  status?: string;
  createdAt?: string;
  message?: string;
  notes?: string[];
  business?: { _id?: string; name?: string };
};

type ApiBusiness = {
  rejectionReason?: string;
  kycRejectionReason?: string;
  _id?: string;
  id?: string;
  name?: string;
  owner?: { _id?: string; name?: string };
  category?: { name?: string };
  address?: Record<string, string>;
  location?: { coordinates?: number[] };
  phone?: string;
  alternatePhone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  logo?: string;
  images?: string[];
  services?: string[];
  workingHours?: BusinessListing['workingHours'];
  listingStatus?: string;
  slug?: string;
  offers?: { _id?: string; title?: string; description?: string; code?: string; occasion?: string; validFrom?: string; validUntil?: string; isActive?: boolean }[];
  verificationStatus?: string;
  googlePlaceVerificationStatus?: 'unverified' | 'verified' | 'mismatch';
  createdAt?: string;
  averageRating?: number;
  reviewCount?: number;
  reviews?: ApiReview[];
  viewCount?: number;
  leadCount?: number;
  description?: string;
  kycStatus?: BusinessListing['kycStatus'];
  gstNumber?: string;
  msmeNumber?: string;
  kycDocuments?: BusinessListing['kycDocuments'];
  plan?: BusinessListing['plan'];
  planExpiresAt?: string;
};

const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://directory-backend-ai6r.onrender.com/api/v1').replace(/\/$/, '');
const token = () => typeof window === 'undefined' ? '' : localStorage.getItem('directflow_access_token') || '';
const clearSession = () => { if (typeof window !== 'undefined') { localStorage.removeItem('directflow_access_token'); localStorage.removeItem('directflow_refresh_token'); } };
let refreshing: Promise<boolean> | null = null;
// Access tokens last 15 minutes. Swap the refresh token for a new pair once, shared by all calls that fail at the same time.
function refreshSession(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  refreshing ??= (async () => {
    const refreshToken = localStorage.getItem('directflow_refresh_token');
    if (!refreshToken) return false;
    try {
      const response = await fetch(`${baseUrl}/auth/refresh-token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.data?.accessToken) return false;
      localStorage.setItem('directflow_access_token', body.data.accessToken);
      if (body.data.refreshToken) localStorage.setItem('directflow_refresh_token', body.data.refreshToken);
      return true;
    } catch { return false; }
  })().finally(() => { refreshing = null; });
  return refreshing;
}
export async function authedFetch(url: string, init: RequestInit & { headers?: Record<string, string> } = {}, retry = true): Promise<Response> {
  const response = await fetch(url, { ...init, headers: { ...(token() ? { Authorization: `Bearer ${token()}` } : {}), ...init.headers } });
  if (response.status !== 401 || !retry) return response;
  if (await refreshSession()) return authedFetch(url, init, false);
  clearSession();
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) window.location.assign('/login');
  return response;
}
export async function request(path: string, options: RequestInit = {}) {
  const response = await authedFetch(`${baseUrl}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> | undefined) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Unable to load dashboard data');
  return body.data || {};
}
export async function logout() { const refreshToken = typeof window === 'undefined' ? '' : localStorage.getItem('directflow_refresh_token') || ''; try { if (refreshToken) await request('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }); } finally { if (typeof window !== 'undefined') { localStorage.removeItem('directflow_access_token'); localStorage.removeItem('directflow_refresh_token'); } } }
const ago = (value?: string) => value ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(Math.round((new Date(value).getTime() - Date.now()) / 86400000), 'day') : 'Recently';
const reviewStats = (item: ApiBusiness) => { const ratings = (item.reviews || []).map((review) => Number(review.rating)).filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5); return ratings.length ? { average: Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(2)), count: ratings.length } : { average: Number(item.averageRating || 0), count: Number(item.reviewCount || 0) }; };
export const toDashboardBusiness = (item: ApiBusiness): BusinessListing => { const stats = reviewStats(item); return ({ id: item._id || item.id || '', name: item.name || 'Business', owner: item.owner?.name || 'Unassigned', ownerId: item.owner?._id, category: (item.category?.name || 'Services') as BusinessListing['category'], location: [item.address?.locality, item.address?.city, item.address?.state].filter(Boolean).join(', ') || 'Location not added', phone: item.phone || 'Not added', alternatePhone: item.alternatePhone, whatsapp: item.whatsapp, email: item.email, website: item.website, logo: item.logo, images: item.images || [], services: item.services || [], address: item.address || {}, workingHours: item.workingHours || [], status: item.listingStatus === 'published' ? 'Active' : item.listingStatus === 'rejected' ? 'Rejected' : item.listingStatus === 'pending_review' ? 'Pending' : item.listingStatus === 'suspended' ? 'Suspended' : item.listingStatus === 'paused' ? 'Paused' : 'Draft', slug: item.slug, rejectionReason: item.rejectionReason, kycRejectionReason: item.kycRejectionReason, offers: (item.offers || []).map((offer) => ({ id: offer._id || '', title: offer.title || '', description: offer.description || '', code: offer.code || '', occasion: offer.occasion || '', validUntil: offer.validUntil || '', isActive: offer.isActive !== false })), timeAgo: ago(item.createdAt), rating: stats.average, averageRating: stats.average, reviewsCount: stats.count, views: Number(item.viewCount || 0), enquiries: Number(item.leadCount || 0), verified: item.verificationStatus === 'verified', googlePlaceVerificationStatus: item.googlePlaceVerificationStatus || 'unverified', description: item.description || '', kycStatus: item.kycStatus || 'not_submitted', gstNumber: item.gstNumber, msmeNumber: item.msmeNumber, kycDocuments: item.kycDocuments || [], plan: item.plan || 'free', planExpiresAt: item.planExpiresAt }); };
export async function loadOwnerDashboard(): Promise<{ businesses: BusinessListing[]; reviews: Review[]; leads: Lead[] }> {
  const [{ items: businesses = [] }, { items: leads = [] }] = await Promise.all([
    request('/owner/businesses?limit=100'),
    request('/owner/leads?limit=100'),
  ]);
  return {
    businesses: (businesses as ApiBusiness[]).map(toDashboardBusiness),
    reviews: (businesses as ApiBusiness[]).flatMap((business) => (business.reviews || []).map((review): Review => ({ id: review._id || '', businessId: business._id || business.id || '', businessName: business.name || 'Business', author: review.reviewerName || 'Customer', rating: Number(review.rating || 0), timeAgo: ago(review.createdAt), createdAt: review.createdAt, comment: review.comment || '', verified: Boolean(review.isVerified), reply: review.reply?.text, replyDate: review.reply?.createdAt }))).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
    leads: (leads as ApiLead[]).map((lead): Lead => ({
      id: lead._id || lead.id || '',
      name: lead.name || 'Customer',
      phone: lead.phone || '',
      email: lead.email,
      service: lead.service,
      status: lead.status === 'contacted' ? 'Contacted' : lead.status === 'converted' ? 'Converted' : 'New',
      timestamp: ago(lead.createdAt),
      message: lead.message || '',
      notes: lead.notes || [],
      targetBusiness: lead.business?.name || 'Business',
      businessId: lead.business?._id,
      createdAt: lead.createdAt,
    })),
  };
}
export async function updateOwnerLeadStatus(id: string, status: Lead['status']) {
  const statusValue: Record<Lead['status'], 'new' | 'contacted' | 'converted'> = { New: 'new', Contacted: 'contacted', Converted: 'converted' };
  await request(`/owner/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status: statusValue[status] }) });
}
export async function addOwnerLeadNote(id: string, note: string) {
  await request(`/owner/leads/${id}/notes`, { method: 'POST', body: JSON.stringify({ note }) });
}
export async function loadAdminDashboard(): Promise<BusinessListing[]> {
  const all: ApiBusiness[] = [];
  for (let page = 1; page <= 50; page += 1) {
    const { items = [], pagination } = await request(`/admin/businesses?limit=100&page=${page}`);
    all.push(...items);
    if (!pagination?.hasNextPage) break;
  }
  return all.map(toDashboardBusiness);
}
export async function loadAdminOwners(): Promise<{ id: string; name: string; email: string }[]> { const { items = [] } = await request('/admin/owners'); return items.map((item: { _id: string; name: string; email: string }) => ({ id: item._id, name: item.name, email: item.email })); }
export async function assignBusinessOwner(id: string, ownerId: string) { const { item } = await request(`/admin/businesses/${id}/owner`, { method: 'PATCH', body: JSON.stringify({ ownerId }) }); return toDashboardBusiness(item); }
export async function reviewBusiness(id: string, decision: 'approve' | 'reject', rejectionReason?: string) { const { item } = await request(`/admin/businesses/${id}/review`, { method: 'PATCH', body: JSON.stringify({ decision, ...(rejectionReason ? { rejectionReason } : {}) }) }); return toDashboardBusiness(item); }
export async function reviewKyc(id: string, decision: 'approve' | 'reject', reason?: string) { const { item } = await request(`/admin/businesses/${id}/kyc`, { method: 'PATCH', body: JSON.stringify({ decision, ...(reason ? { reason } : {}) }) }); return toDashboardBusiness(item); }
export async function setBusinessPlan(id: string, plan: 'free' | 'premium', planExpiresAt?: string) { const { item } = await request(`/admin/businesses/${id}/plan`, { method: 'PATCH', body: JSON.stringify({ plan, ...(planExpiresAt ? { planExpiresAt } : {}) }) }); return toDashboardBusiness(item); }
export async function clearGooglePlaceMismatch(id: string) { const { item } = await request(`/admin/businesses/${id}/google-place`, { method: 'PATCH' }); return toDashboardBusiness(item); }
export async function loadBusinessFormData() { const { items = [] } = await request('/categories/tree'); return { categories: items }; }
export async function geocodeBusinessAddress(address: { addressLine1: string; addressLine2?: string; landmark?: string; locality?: string; city: string; state: string; postalCode?: string; country: string }) { const params = new URLSearchParams(Object.entries(address).filter((entry): entry is [string, string] => Boolean(entry[1]))); const { point } = await request(`/owner/geocode?${params}`, { signal: AbortSignal.timeout(15000) }); return point as { lat: number; lng: number; label: string }; }
export async function loadAdminBusiness(id: string) { const { item } = await request(`/admin/businesses/${id}`); return item; }
export async function createAdminBusiness(payload: Record<string, unknown>) { const { item } = await request('/admin/businesses', { method: 'POST', body: JSON.stringify(payload) }); return toDashboardBusiness(item); }
export async function updateAdminBusiness(id: string, payload: Record<string, unknown>) { const { item } = await request(`/admin/businesses/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }); return toDashboardBusiness(item); }
export async function setAdminBusinessStatus(id: string, status: 'published' | 'suspended') { const { item } = await request(`/admin/businesses/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); return toDashboardBusiness(item); }
export async function deleteAdminBusiness(id: string) { await request(`/admin/businesses/${id}`, { method: 'DELETE' }); }
export async function loadOwnerBusiness(id: string) { const { item } = await request(`/owner/businesses/${id}`); return item; }
export async function createOwnerBusiness(payload: Record<string, unknown>) { const { item } = await request('/owner/businesses', { method: 'POST', body: JSON.stringify(payload) }); return toDashboardBusiness(item); }
export async function updateOwnerBusiness(id: string, payload: Record<string, unknown>) { const { item } = await request(`/owner/businesses/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }); return toDashboardBusiness(item); }
export async function uploadBusinessDocuments(files: File[]) { const form = new FormData(); files.forEach(file => form.append('files', file)); const response = await authedFetch(`${baseUrl}/owner/documents`, { method: 'POST', body: form }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.message || 'Unable to upload files'); return (body.data?.urls || []) as string[]; }
export async function uploadBusinessImages(files: File[]) { const urls: string[] = []; for (let offset = 0; offset < files.length; offset += 10) { const form = new FormData(); files.slice(offset, offset + 10).forEach(file => form.append('images', file)); const response = await authedFetch(`${baseUrl}/owner/uploads`, { method: 'POST', body: form }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.message || 'Unable to upload images'); urls.push(...(body.data?.urls || [])); } return urls; }
export type ManagedCategory = { _id: string; name: string; icon?: string; isActive?: boolean; displayOrder?: number; services?: string[]; children?: ManagedCategory[] };
export async function loadAdminCategories(): Promise<ManagedCategory[]> { const { items = [] } = await request('/admin/categories'); return items; }
export async function createCategory(name: string, parentCategory?: string, icon?: string) { const { item } = await request('/admin/categories', { method: 'POST', body: JSON.stringify({ name, ...(parentCategory ? { parentCategory } : {}), ...(icon ? { icon } : {}) }) }); return item; }
export async function updateCategory(id: string, patch: { name?: string; icon?: string; isActive?: boolean; displayOrder?: number; services?: string[] }) { const { item } = await request(`/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }); return item; }
export async function deleteCategory(id: string) { await request(`/admin/categories/${id}`, { method: 'DELETE' }); }
export async function addCategoryServices(id: string, services: string[]) { const { item } = await request(`/admin/categories/${id}/services`, { method: 'POST', body: JSON.stringify({ services }) }); return item; }
async function uploadCsv(path: string, file: File) { const form = new FormData(); form.append('file', file); const response = await authedFetch(`${baseUrl}${path}`, { method: 'POST', body: form }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.message || 'Unable to import CSV'); return body.data || {}; }
export const importCategoriesCsv = (file: File, parentId?: string) => uploadCsv(parentId ? `/admin/categories/${parentId}/subcategories/import` : '/admin/categories/import', file);
export const importServicesCsv = (file: File, categoryId: string) => uploadCsv(`/admin/categories/${categoryId}/services/import`, file);
export async function importBusinessesCsv(file: File): Promise<{ businesses: BusinessListing[]; createdCount: number; failed: { row: number; businessName: string; message: string }[] }> {
  const result = await uploadCsv('/admin/businesses/import', file) as {
    items?: ApiBusiness[];
    createdCount?: number;
    failed?: { row: number; businessName: string; message: string }[];
  };
  const items = result.items || [];
  return {
    businesses: items.map(toDashboardBusiness),
    createdCount: result.createdCount ?? items.length,
    failed: result.failed || [],
  };
}

export type AnalyticsDay = { day: string; views: number; calls: number; whatsapp: number; directions: number; website: number; inquiries: number };
export type Analytics = { days: number; series: AnalyticsDay[]; totals: AnalyticsDay; previous: AnalyticsDay; businesses: { id: string; name: string }[] };
export async function loadAnalytics(days: 7 | 30 | 90, businessId?: string): Promise<Analytics> { const params = new URLSearchParams({ days: String(days), ...(businessId ? { business: businessId } : {}) }); return request(`/owner/analytics?${params}`); }
export async function replyToReview(businessId: string, reviewId: string, text: string) { const data = await request(`/owner/businesses/${businessId}/reviews/${reviewId}/reply`, { method: 'PUT', body: JSON.stringify({ text }) }); return data.reply as { text: string; createdAt: string }; }
export async function removeReviewReply(businessId: string, reviewId: string) { await request(`/owner/businesses/${businessId}/reviews/${reviewId}/reply`, { method: 'DELETE' }); }
export async function setListingVisibility(businessId: string, visible: boolean) { return request(`/owner/businesses/${businessId}/visibility`, { method: 'POST', body: JSON.stringify({ visible }) }); }

// ---- Admin: people, reviews, inquiries, numbers ----
export type Paged<T> = { items: T[]; pagination: { page: number; limit: number; totalItems: number; totalPages: number } };
export type AdminUser = { _id: string; name: string; email?: string; phone?: string; role: 'customer' | 'business_owner' | 'admin' | 'super_admin'; status: 'active' | 'suspended'; emailVerified?: boolean; createdAt?: string; lastLoginAt?: string; listingsCount: number; reviewsCount: number };
export type AdminUserDetail = { item: AdminUser; listings: { _id: string; name: string; listingStatus: string; kycStatus?: string; verificationStatus?: string; averageRating?: number; reviewCount?: number; viewCount?: number; leadCount?: number; address?: { city?: string; locality?: string }; category?: { name?: string }; createdAt?: string }[]; reviews: { id: string; businessId: string; businessName: string; rating: number; comment: string; createdAt?: string; reply?: string }[] };
export type AdminReview = { id: string; businessId: string; businessName: string; rating: number; comment: string; createdAt?: string; reviewerName: string; reviewerId: string | null; reviewerEmail: string; source: 'member' | 'imported'; reply: string };
export type AdminLead = { _id: string; name: string; phone: string; email?: string; service?: string; message: string; status: 'new' | 'contacted' | 'converted'; createdAt?: string; business?: { _id: string; name: string; owner?: { _id: string; name: string; email?: string } } };
export type AdminStats = { customers: number; owners: number; admins: number; reviews: number; leads: number; leadsLast7Days: number };
const qs = (params: Record<string, string | number | undefined>) => { const search = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '' && value !== 'all') search.set(key, String(value)); }); return search.toString(); };
export const loadAdminStats = async (): Promise<AdminStats> => request('/admin/stats');
export const loadAdminUsers = async (params: Record<string, string | number | undefined>): Promise<Paged<AdminUser>> => request(`/admin/users?${qs(params)}`);
export const loadAdminUser = async (id: string): Promise<AdminUserDetail> => request(`/admin/users/${id}`);
export const setAdminUserStatus = async (id: string, status: 'active' | 'suspended') => request(`/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const loadAdminReviews = async (params: Record<string, string | number | undefined>): Promise<Paged<AdminReview>> => request(`/admin/reviews?${qs(params)}`);
export const deleteAdminReview = async (businessId: string, reviewId: string) => { await request(`/admin/businesses/${businessId}/reviews/${reviewId}`, { method: 'DELETE' }); };
export const loadAdminLeads = async (params: Record<string, string | number | undefined>): Promise<Paged<AdminLead>> => request(`/admin/leads?${qs(params)}`);
export type ListingAction = 'suspend' | 'restore' | 'delete';
export const bulkListingsAction = async (ids: string[], action: ListingAction): Promise<{ count: number }> => request('/admin/businesses/bulk', { method: 'POST', body: JSON.stringify({ ids, action }) });
export const ownerListingsAction = async (userId: string, action: ListingAction): Promise<{ count: number }> => request(`/admin/users/${userId}/listings`, { method: 'POST', body: JSON.stringify({ action }) });
