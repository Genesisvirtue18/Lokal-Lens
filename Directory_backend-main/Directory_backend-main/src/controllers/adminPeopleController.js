import mongoose from 'mongoose';
import { Business } from '../models/Business.js';
import { Lead } from '../models/Lead.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const paging = (page, limit, totalItems) => ({ page, limit, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / limit)), hasNextPage: page * limit < totalItems, hasPreviousPage: page > 1 });
const asIds = (items) => items.map((item) => new mongoose.Types.ObjectId(String(item._id)));

// ---- People (customers, owners, admins) -------------------------------------------------------------
export const listUsers = () => async (req, res, next) => { try {
  const { page, limit, role, status, search } = req.validated.query;
  const filter = { deletedAt: null, status: { $ne: 'deleted' }, ...(role ? { role } : {}), ...(status ? { status } : {}) };
  if (search) { const rx = new RegExp(escapeRegex(search), 'i'); filter.$or = [{ name: rx }, { email: rx }, { phone: rx }]; }
  const [users, totalItems] = await Promise.all([
    User.find(filter).select('name email phone role status emailVerified createdAt lastLoginAt').sort('-createdAt').skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  const ids = asIds(users);
  const [listingRows, reviewRows] = await Promise.all([
    Business.aggregate([{ $match: { owner: { $in: ids }, deletedAt: null } }, { $group: { _id: '$owner', count: { $sum: 1 } } }]),
    Business.aggregate([{ $match: { 'reviews.user': { $in: ids } } }, { $unwind: '$reviews' }, { $match: { 'reviews.user': { $in: ids } } }, { $group: { _id: '$reviews.user', count: { $sum: 1 } } }]),
  ]);
  const listings = new Map(listingRows.map((row) => [String(row._id), row.count]));
  const reviews = new Map(reviewRows.map((row) => [String(row._id), row.count]));
  const items = users.map((user) => ({ ...user, listingsCount: listings.get(String(user._id)) || 0, reviewsCount: reviews.get(String(user._id)) || 0 }));
  sendSuccess(res, 'Users retrieved successfully', { items, pagination: paging(page, limit, totalItems) });
} catch (error) { next(error); } };

export const userDetail = () => async (req, res, next) => { try {
  const user = await User.findOne({ _id: req.params.id, deletedAt: null }).select('name email phone role status emailVerified phoneVerified createdAt lastLoginAt notificationPreferences').lean();
  if (!user) throw new AppError('User not found', 404);
  const id = new mongoose.Types.ObjectId(String(user._id));
  const [listings, reviewRows] = await Promise.all([
    Business.find({ owner: id, deletedAt: null }).select('name slug listingStatus verificationStatus kycStatus address.city address.locality averageRating reviewCount viewCount leadCount createdAt').populate('category', 'name').sort('-createdAt').lean(),
    Business.aggregate([{ $match: { 'reviews.user': id } }, { $unwind: '$reviews' }, { $match: { 'reviews.user': id } }, { $sort: { 'reviews.createdAt': -1 } }, { $limit: 100 }, { $project: { businessId: '$_id', businessName: '$name', review: '$reviews' } }]),
  ]);
  const reviews = reviewRows.map((row) => ({ id: String(row.review._id), businessId: String(row.businessId), businessName: row.businessName, rating: row.review.rating, comment: row.review.comment || '', createdAt: row.review.createdAt, reply: row.review.reply?.text || '' }));
  sendSuccess(res, 'User retrieved successfully', { item: user, listings, reviews });
} catch (error) { next(error); } };

// Suspending blocks sign-in straight away (the access check requires an active account) and ends their sessions.
export const setUserStatus = () => async (req, res, next) => { try {
  const user = await User.findOne({ _id: req.params.id, deletedAt: null });
  if (!user) throw new AppError('User not found', 404);
  if (['admin', 'super_admin'].includes(user.role)) throw new AppError('Admin accounts can’t be suspended here', 403);
  if (String(user._id) === String(req.user.id)) throw new AppError('You can’t suspend your own account', 403);
  user.status = req.validated.body.status;
  await user.save();
  if (user.status === 'suspended') await RefreshToken.updateMany({ user: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  sendSuccess(res, user.status === 'suspended' ? 'Account suspended' : 'Account reactivated', { item: { _id: user._id, status: user.status } });
} catch (error) { next(error); } };

// ---- Every review on the platform, with who wrote it and where -------------------------------------
export const listReviews = () => async (req, res, next) => { try {
  const { page, limit, rating, replied, search } = req.validated.query;
  const after = [];
  if (rating) after.push({ 'reviews.rating': rating });
  if (replied === 'yes') after.push({ 'reviews.reply.text': { $exists: true } });
  if (replied === 'no') after.push({ 'reviews.reply.text': { $exists: false } });
  if (search) { const rx = new RegExp(escapeRegex(search), 'i'); after.push({ $or: [{ 'reviews.reviewerName': rx }, { 'reviews.comment': rx }, { name: rx }] }); }
  const pipeline = [{ $match: { deletedAt: null, 'reviews.0': { $exists: true } } }, { $unwind: '$reviews' }, ...(after.length ? [{ $match: { $and: after } }] : [])];
  const [result = { items: [], count: [] }] = await Business.aggregate([...pipeline, { $facet: { items: [{ $sort: { 'reviews.createdAt': -1 } }, { $skip: (page - 1) * limit }, { $limit: limit }, { $project: { businessId: '$_id', businessName: '$name', ownerId: '$owner', review: '$reviews' } }], count: [{ $count: 'total' }] } }]);
  const userIds = [...new Set(result.items.map((row) => row.review.user).filter(Boolean).map(String))];
  const people = userIds.length ? await User.find({ _id: { $in: userIds } }).select('name email').lean() : [];
  const byId = new Map(people.map((person) => [String(person._id), person]));
  const items = result.items.map((row) => { const person = row.review.user ? byId.get(String(row.review.user)) : null; return { id: String(row.review._id), businessId: String(row.businessId), businessName: row.businessName, rating: row.review.rating, comment: row.review.comment || '', createdAt: row.review.createdAt, reviewerName: person?.name || row.review.reviewerName, reviewerId: person ? String(person._id) : null, reviewerEmail: person?.email || '', source: person ? 'member' : 'imported', reply: row.review.reply?.text || '' }; });
  sendSuccess(res, 'Reviews retrieved successfully', { items, pagination: paging(page, limit, result.count[0]?.total || 0) });
} catch (error) { next(error); } };

// ---- Inquiries sent to any business, and which owner they went to ----------------------------------
export const listLeads = () => async (req, res, next) => { try {
  const { page, limit, status, search } = req.validated.query;
  const filter = { ...(status ? { status } : {}) };
  if (search) { const rx = new RegExp(escapeRegex(search), 'i'); filter.$or = [{ name: rx }, { phone: rx }, { email: rx }, { message: rx }]; }
  const [items, totalItems] = await Promise.all([
    Lead.find(filter).populate({ path: 'business', select: 'name owner', populate: { path: 'owner', select: 'name email' } }).sort('-createdAt').skip((page - 1) * limit).limit(limit).lean(),
    Lead.countDocuments(filter),
  ]);
  sendSuccess(res, 'Inquiries retrieved successfully', { items, pagination: paging(page, limit, totalItems) });
} catch (error) { next(error); } };

// ---- Numbers for the overview ---------------------------------------------------------------------
export const stats = () => async (_req, res, next) => { try {
  const since = new Date(Date.now() - 7 * 86400000);
  const [roles, leads, newLeads, reviewRows] = await Promise.all([
    User.aggregate([{ $match: { deletedAt: null, status: { $ne: 'deleted' } } }, { $group: { _id: '$role', count: { $sum: 1 } } }]),
    Lead.countDocuments({}),
    Lead.countDocuments({ createdAt: { $gte: since } }),
    Business.aggregate([{ $match: { deletedAt: null } }, { $group: { _id: null, count: { $sum: { $size: { $ifNull: ['$reviews', []] } } } } }]),
  ]);
  const byRole = Object.fromEntries(roles.map((row) => [row._id, row.count]));
  sendSuccess(res, 'Stats retrieved successfully', { customers: byRole.customer || 0, owners: byRole.business_owner || 0, admins: (byRole.admin || 0) + (byRole.super_admin || 0), reviews: reviewRows[0]?.count || 0, leads, leadsLast7Days: newLeads });
} catch (error) { next(error); } };

// ---- Bulk actions on listings: all of one owner's, or a selected set ----------------------------
const applyListingAction = async (filter, action) => {
  const base = { ...filter, deletedAt: null };
  if (action === 'suspend') return (await Business.updateMany({ ...base, listingStatus: { $in: ['published', 'paused'] } }, { $set: { listingStatus: 'suspended' } })).modifiedCount;
  if (action === 'restore') return (await Business.updateMany({ ...base, listingStatus: 'suspended' }, { $set: { listingStatus: 'published' } })).modifiedCount;
  return (await Business.updateMany(base, { $set: { listingStatus: 'deleted', deletedAt: new Date() } })).modifiedCount;
};
const doneMessage = (action, count) => `${count} listing${count === 1 ? '' : 's'} ${action === 'suspend' ? 'suspended' : action === 'restore' ? 'restored' : 'deleted'}`;

export const ownerListingsAction = () => async (req, res, next) => { try {
  const user = await User.findOne({ _id: req.params.id, deletedAt: null }).select('role').lean();
  if (!user) throw new AppError('User not found', 404);
  const { action } = req.validated.body;
  const count = await applyListingAction({ owner: user._id }, action);
  sendSuccess(res, doneMessage(action, count), { count });
} catch (error) { next(error); } };

export const bulkListingsAction = () => async (req, res, next) => { try {
  const { ids, action } = req.validated.body;
  const count = await applyListingAction({ _id: { $in: ids } }, action);
  sendSuccess(res, doneMessage(action, count), { count });
} catch (error) { next(error); } };
