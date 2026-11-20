import { User } from '../models/User.js';
import { Business } from '../models/Business.js';
import { Lead } from '../models/Lead.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';
export const profile = () => (req, res) => sendSuccess(res, 'Profile retrieved successfully', { user: req.user.toJSON() });
export const updateProfile = () => async (req, res, next) => { try { const allowed = ['name', 'phone', 'avatar', 'notificationPreferences']; for (const key of allowed) if (key in req.validated.body) req.user[key] = req.validated.body[key]; await req.user.save(); sendSuccess(res, 'Profile updated successfully', { user: req.user.toJSON() }); } catch (e) { next(e); } };
export const deleteAccount = () => async (req, res, next) => { try { if (['admin', 'super_admin'].includes(req.user.role)) throw new AppError('Admin accounts can’t be deleted here. Ask another super admin to change your role first.', 403); req.user.status = 'deleted'; req.user.deletedAt = new Date(); await req.user.save(); sendSuccess(res, 'Account deleted successfully'); } catch (e) { next(e); } };
// A customer who runs a business switches the same account to a business account (their saved places, reviews and inquiries stay).
export const becomeOwner = () => async (req, res, next) => { try {
  if (['admin', 'super_admin'].includes(req.user.role)) throw new AppError('Admin accounts can’t be changed to a business account.', 403);
  if (req.user.role !== 'business_owner') {
    if (!req.user.phone) throw new AppError('Add your mobile number in Account settings first. Customers use it to reach your business.', 400);
    req.user.role = 'business_owner'; await req.user.save();
  }
  sendSuccess(res, 'Your account is now a business account', { user: req.user.toJSON() });
} catch (e) { next(e); } };
export const activity = () => async (req, res, next) => { try { const items = await User.findById(req.user.id).select('createdAt lastLoginAt passwordChangedAt'); sendSuccess(res, 'Activity retrieved successfully', { items }); } catch (e) { next(e); } };

// ---- Customer account: saved businesses, own reviews, own inquiries ----
const LIVE = { listingStatus: 'published', deletedAt: null };
const SAVED_LIMIT = 200;
const card = 'name slug category address images logo averageRating reviewCount verificationStatus phone';

export const savedList = () => async (req, res, next) => { try {
  const user = await User.findById(req.user.id).select('saved').lean();
  const ids = (user?.saved || []).map(String);
  const found = await Business.find({ _id: { $in: ids }, ...LIVE }).select(card).populate('category', 'name').lean();
  const byId = new Map(found.map(item => [String(item._id), item]));
  // Newest save first; listings that were paused or deleted since are left out (but stay in the list in case they return).
  const items = ids.reverse().map(id => byId.get(id)).filter(Boolean);
  sendSuccess(res, 'Saved businesses retrieved', { items });
} catch (e) { next(e); } };

export const savedAdd = () => async (req, res, next) => { try {
  const business = await Business.findOne({ _id: req.params.id, ...LIVE }).select('_id').lean();
  if (!business) throw new AppError('Business not found', 404);
  const user = await User.findById(req.user.id).select('saved');
  if (!user.saved.some(id => String(id) === String(business._id))) {
    if (user.saved.length >= SAVED_LIMIT) throw new AppError(`You can save up to ${SAVED_LIMIT} businesses. Remove some to add more.`, 422);
    user.saved.push(business._id); await user.save();
  }
  sendSuccess(res, 'Saved', { count: user.saved.length });
} catch (e) { next(e); } };

export const savedRemove = () => async (req, res, next) => { try {
  await User.updateOne({ _id: req.user.id }, { $pull: { saved: req.params.id } });
  sendSuccess(res, 'Removed from saved');
} catch (e) { next(e); } };

// Merges businesses saved on this device (before signing in) into the account.
export const savedSync = () => async (req, res, next) => { try {
  const wanted = [...new Set(req.validated.body.ids)];
  const live = wanted.length ? await Business.find({ _id: { $in: wanted }, ...LIVE }).select('_id').lean() : [];
  const user = await User.findById(req.user.id).select('saved');
  const have = new Set(user.saved.map(String));
  for (const item of live) if (!have.has(String(item._id)) && user.saved.length < SAVED_LIMIT) user.saved.push(item._id);
  await user.save();
  sendSuccess(res, 'Saved list synced', { ids: user.saved.map(String) });
} catch (e) { next(e); } };

export const myReviews = () => async (req, res, next) => { try {
  const businesses = await Business.find({ 'reviews.user': req.user.id, deletedAt: null }).select('name slug address.city address.locality listingStatus reviews').lean();
  const items = businesses.flatMap(business => (business.reviews || []).filter(review => review.user && String(review.user) === String(req.user.id)).map(review => ({
    id: String(review._id), businessId: String(business._id), businessName: business.name, slug: business.slug, live: business.listingStatus === 'published',
    area: [business.address?.locality, business.address?.city].filter(Boolean).join(', '), rating: review.rating, comment: review.comment || '', createdAt: review.createdAt,
    reply: review.reply ? { text: review.reply.text, createdAt: review.reply.createdAt } : null,
  }))).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  sendSuccess(res, 'Your reviews retrieved', { items });
} catch (e) { next(e); } };

export const deleteMyReview = () => async (req, res, next) => { try {
  const business = await Business.findOne({ _id: req.params.id, deletedAt: null });
  if (!business) throw new AppError('Business not found', 404);
  const review = business.reviews.find(item => item.user && String(item.user) === String(req.user.id));
  if (!review) throw new AppError('You have no review on this business', 404);
  review.deleteOne(); await business.save();
  sendSuccess(res, 'Your review was deleted');
} catch (e) { next(e); } };

// Only inquiries sent while signed in are linked to the account (matching by email would expose other people's messages).
export const myInquiries = () => async (req, res, next) => { try {
  const leads = await Lead.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(100).populate('business', 'name slug phone address.city listingStatus').lean();
  const items = leads.map(lead => ({ id: String(lead._id), service: lead.service || '', message: lead.message, status: lead.status, withdrawn: Boolean(lead.withdrawnAt), replies: (lead.replies || []).map(reply => ({ text: reply.text, createdAt: reply.createdAt })), createdAt: lead.createdAt, business: lead.business ? { id: String(lead.business._id), name: lead.business.name, slug: lead.business.slug, phone: lead.business.phone, city: lead.business.address?.city, live: lead.business.listingStatus === 'published' } : null }));
  sendSuccess(res, 'Your inquiries retrieved', { items });
} catch (e) { next(e); } };

// The customer takes an inquiry back. The business still sees it (marked withdrawn) but can no longer reply.
export const withdrawInquiry = () => async (req, res, next) => { try {
  const lead = await Lead.findOne({ _id: req.params.id, user: req.user.id });
  if (!lead) throw new AppError('Inquiry not found', 404);
  if (!lead.withdrawnAt) { lead.withdrawnAt = new Date(); await lead.save(); }
  sendSuccess(res, 'Inquiry withdrawn', {});
} catch (e) { next(e); } };
