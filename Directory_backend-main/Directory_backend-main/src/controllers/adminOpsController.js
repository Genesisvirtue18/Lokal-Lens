import mongoose from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import { Business } from '../models/Business.js';
import { ListingClaim } from '../models/ListingClaim.js';
import { ReviewReport } from '../models/ReviewReport.js';
import { User } from '../models/User.js';
import { dashboardUrl, emailPerson } from '../services/notices.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const paging = (page, limit, totalItems) => ({ page, limit, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / limit)), hasNextPage: page * limit < totalItems, hasPreviousPage: page > 1 });
const isSuper = (user) => user.role === 'super_admin';

// ---- Activity log --------------------------------------------------------------------------------
export const listActivity = () => async (req, res, next) => { try {
  const { page, limit, search, type } = req.validated.query;
  const filter = { ...(type ? { targetType: type } : {}) };
  if (search) { const rx = new RegExp(escapeRegex(search), 'i'); filter.$or = [{ label: rx }, { targetName: rx }, { actorName: rx }, { details: rx }]; }
  const [items, totalItems] = await Promise.all([AuditLog.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit).lean(), AuditLog.countDocuments(filter)]);
  sendSuccess(res, 'Activity retrieved successfully', { items, pagination: paging(page, limit, totalItems) });
} catch (error) { next(error); } };

// ---- Roles and new accounts ---------------------------------------------------------------------
// Only a super admin can create admins, promote someone to admin, or change an admin. Nobody can change their own role.
export const changeRole = () => async (req, res, next) => { try {
  const user = await User.findOne({ _id: req.params.id, deletedAt: null });
  if (!user) throw new AppError('User not found', 404);
  const { role } = req.validated.body;
  if (String(user._id) === String(req.user.id)) throw new AppError('You can’t change your own role', 403);
  if (isSuper(user)) throw new AppError('A super admin’s role can’t be changed here', 403);
  if ((user.role === 'admin' || role === 'admin') && !isSuper(req.user)) throw new AppError('Only a super admin can make or change an admin', 403);
  user.role = role;
  await user.save();
  sendSuccess(res, 'Role updated', { item: { _id: user._id, role: user.role } });
} catch (error) { next(error); } };

// The new person signs in with a code sent to their email, so no password is created or shared.
export const createUser = (config, mailer) => async (req, res, next) => { try {
  const { name, email, role } = req.validated.body;
  if (role === 'admin' && !isSuper(req.user)) throw new AppError('Only a super admin can create an admin', 403);
  if (await User.exists({ email: email.toLowerCase(), deletedAt: null })) throw new AppError('An account with this email already exists', 409);
  const user = await User.create({ name, email: email.toLowerCase(), role, status: 'active', emailVerified: false });
  emailPerson(mailer, user, 'Your Lokal Lens account is ready', [`Hi ${name},`, '', `An account was created for you on Lokal Lens${role === 'customer' ? '' : ` as ${role === 'admin' ? 'an administrator' : 'a business owner'}`}.`, `Sign in with your email address and the one-time code we send you: ${config?.CLIENT_URL || ''}/login`]);
  sendSuccess(res, 'Account created', { item: { _id: user._id, name: user.name, email: user.email, role: user.role } }, 201);
} catch (error) { next(error); } };

// ---- Review reports -----------------------------------------------------------------------------
// A signed-in person (a customer, or the business owner) flags a review. They can't flag their own.
export const reportReview = () => async (req, res, next) => { try {
  const business = await Business.findOne({ _id: req.params.id, deletedAt: null }).select('reviews name owner');
  if (!business) throw new AppError('Business not found', 404);
  const review = business.reviews.id(req.params.reviewId);
  if (!review) throw new AppError('Review not found', 404);
  if (review.user && String(review.user) === String(req.user.id)) throw new AppError('You can’t report your own review', 403);
  const { reason, note } = req.validated.body;
  try {
    await ReviewReport.create({ business: business._id, reviewId: review._id, snapshot: { reviewerName: review.reviewerName, rating: review.rating, comment: review.comment || '' }, reporter: req.user.id, reporterRole: String(business.owner) === String(req.user.id) ? 'business_owner' : req.user.role, reason, ...(note ? { note } : {}) });
  } catch (error) { if (error?.code === 11000) throw new AppError('You already reported this review. Our team will look at it.', 409); throw error; }
  sendSuccess(res, 'Thanks. Our team will review this report.', {}, 201);
} catch (error) { next(error); } };

export const listReports = () => async (req, res, next) => { try {
  const { page, limit, status } = req.validated.query;
  const filter = status === 'all' ? {} : { status: status || 'open' };
  const [rows, totalItems] = await Promise.all([
    ReviewReport.find(filter).populate('business', 'name').populate('reporter', 'name email role').sort('-createdAt').skip((page - 1) * limit).limit(limit).lean(),
    ReviewReport.countDocuments(filter),
  ]);
  // Show the review as it is now (the reviewer may have edited it), and tell the admin when it is already gone.
  const ids = [...new Set(rows.map((row) => String(row.business?._id)).filter(Boolean))];
  const businesses = await Business.find({ _id: { $in: ids } }).select('reviews').lean();
  const live = new Map();
  for (const business of businesses) for (const review of business.reviews || []) live.set(String(review._id), review);
  const items = rows.map((row) => { const review = live.get(String(row.reviewId)); return { ...row, currentReview: review ? { reviewerName: review.reviewerName, rating: review.rating, comment: review.comment || '' } : null }; });
  sendSuccess(res, 'Reports retrieved successfully', { items, pagination: paging(page, limit, totalItems) });
} catch (error) { next(error); } };

export const resolveReport = () => async (req, res, next) => { try {
  const report = await ReviewReport.findById(req.params.id);
  if (!report) throw new AppError('Report not found', 404);
  const { action, note } = req.validated.body;
  if (action === 'remove') {
    const business = await Business.findOne({ _id: report.business, deletedAt: null });
    const review = business?.reviews.id(report.reviewId);
    if (review) { review.deleteOne(); await business.save(); }
    await ReviewReport.updateMany({ reviewId: report.reviewId, status: 'open' }, { $set: { status: 'removed', resolvedBy: req.user.id, resolvedAt: new Date(), ...(note ? { resolutionNote: note } : {}) } });
  } else {
    report.status = 'dismissed'; report.resolvedBy = req.user.id; report.resolvedAt = new Date(); if (note) report.resolutionNote = note;
    await report.save();
  }
  sendSuccess(res, action === 'remove' ? 'Review removed' : 'Report dismissed', {});
} catch (error) { next(error); } };

// ---- Listing claims -----------------------------------------------------------------------------
export const myClaims = () => async (req, res, next) => { try {
  const items = await ListingClaim.find({ claimant: req.user.id }).populate('business', 'name slug address.city').sort('-createdAt').limit(50).lean();
  sendSuccess(res, 'Claims retrieved successfully', { items });
} catch (error) { next(error); } };

export const listClaims = () => async (req, res, next) => { try {
  const { page, limit, status } = req.validated.query;
  const filter = status === 'all' ? {} : { status: status || 'pending' };
  const [items, totalItems] = await Promise.all([
    ListingClaim.find(filter).populate({ path: 'business', select: 'name address.city address.state owner phone email website', populate: { path: 'owner', select: 'name email' } }).populate('claimant', 'name email phone emailVerified').populate('previousOwner', 'name email').sort('-createdAt').skip((page - 1) * limit).limit(limit).lean(),
    ListingClaim.countDocuments(filter),
  ]);
  sendSuccess(res, 'Claims retrieved successfully', { items, pagination: paging(page, limit, totalItems) });
} catch (error) { next(error); } };

export const decideClaim = (config, mailer) => async (req, res, next) => { try {
  const claim = await ListingClaim.findById(req.params.id);
  if (!claim) throw new AppError('Claim not found', 404);
  if (claim.status !== 'pending') throw new AppError('This claim was already decided', 409);
  const { decision, note } = req.validated.body;
  const business = await Business.findOne({ _id: claim.business, deletedAt: null }).populate('owner', 'name email notificationPreferences');
  if (!business) throw new AppError('The business no longer exists', 404);
  const claimant = await User.findById(claim.claimant).select('name email notificationPreferences status role');
  if (decision === 'approve' && (!claimant || claimant.status !== 'active')) throw new AppError('The claimant’s account isn’t active', 422);
  const previous = business.owner;
  claim.status = decision === 'approve' ? 'approved' : 'rejected'; claim.decidedBy = req.user.id; claim.decidedAt = new Date(); if (note) claim.decisionNote = note; if (previous) claim.previousOwner = previous._id;
  await claim.save();
  if (decision === 'approve') {
    if (claimant.role === 'customer') await User.updateOne({ _id: claimant._id }, { $set: { role: 'business_owner' } });
    business.owner = claimant._id;
    await business.save();
    await ListingClaim.updateMany({ business: business._id, status: 'pending', _id: { $ne: claim._id } }, { $set: { status: 'rejected', decisionNote: 'Another claim for this listing was approved.', decidedBy: req.user.id, decidedAt: new Date() } });
    emailPerson(mailer, claimant, `You now manage ${business.name} on Lokal Lens`, [`Good news. Your claim for “${business.name}” was approved.`, ...(note ? ['', note] : []), '', `Manage the listing here: ${dashboardUrl(config)}`]);
    if (previous && String(previous._id) !== String(claimant._id)) emailPerson(mailer, previous, `“${business.name}” was moved to another owner`, [`Our team approved a claim for “${business.name}”, so it is no longer in your account.`, 'If you think this is a mistake, reply to this email.']);
  } else {
    emailPerson(mailer, claimant, `Your claim for ${business.name} wasn’t approved`, [`We couldn’t approve your claim for “${business.name}”.`, ...(note ? ['', `Reason: ${note}`] : []), '', 'You can send a new claim with clearer proof.']);
  }
  sendSuccess(res, decision === 'approve' ? 'Claim approved. The listing now belongs to the claimant.' : 'Claim rejected', {});
} catch (error) { next(error); } };

// ---- CSV exports --------------------------------------------------------------------------------
// Cells that start with = + - @ are prefixed so a spreadsheet never runs them as a formula.
const cell = (value) => { let text = String(value ?? '').replace(/\r?\n/g, ' '); if (/^[=+\-@\t]/.test(text)) text = `'${text}`; return `"${text.replace(/"/g, '""')}"`; };
const sendCsv = (res, name, header, rows) => {
  const csv = `﻿${[header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n')}`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Content-Disposition', `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
};

export const exportBusinesses = () => async (_req, res, next) => { try {
  const items = await Business.find({ deletedAt: null }).populate('owner', 'name email').populate('category', 'name').sort('-createdAt').lean();
  sendCsv(res, 'businesses', ['Name', 'Category', 'City', 'State', 'Address', 'Phone', 'Email', 'Website', 'Status', 'Verified', 'KYC', 'Plan', 'Owner', 'Owner email', 'Rating', 'Reviews', 'Views', 'Inquiries', 'Created'],
    items.map((item) => [item.name, item.category?.name, item.address?.city, item.address?.state, [item.address?.addressLine1, item.address?.locality].filter(Boolean).join(', '), item.phone, item.email, item.website, item.listingStatus, item.verificationStatus === 'verified' ? 'Yes' : 'No', item.kycStatus, item.plan || 'free', item.owner?.name || '', item.owner?.email || '', item.averageRating || '', item.reviewCount || 0, item.viewCount || 0, item.leadCount || 0, item.createdAt ? new Date(item.createdAt).toISOString().slice(0, 10) : '']));
} catch (error) { next(error); } };

export const exportUsers = () => async (_req, res, next) => { try {
  const users = await User.find({ deletedAt: null, status: { $ne: 'deleted' } }).select('name email phone role status emailVerified createdAt lastLoginAt').sort('-createdAt').lean();
  const ids = users.map((user) => new mongoose.Types.ObjectId(String(user._id)));
  const rows = await Business.aggregate([{ $match: { owner: { $in: ids }, deletedAt: null } }, { $group: { _id: '$owner', count: { $sum: 1 } } }]);
  const counts = new Map(rows.map((row) => [String(row._id), row.count]));
  sendCsv(res, 'people', ['Name', 'Email', 'Phone', 'Type', 'Status', 'Email confirmed', 'Listings', 'Joined', 'Last sign-in'],
    users.map((user) => [user.name, user.email || '', user.phone || '', user.role, user.status, user.emailVerified ? 'Yes' : 'No', counts.get(String(user._id)) || 0, user.createdAt ? new Date(user.createdAt).toISOString().slice(0, 10) : '', user.lastLoginAt ? new Date(user.lastLoginAt).toISOString().slice(0, 10) : '']));
} catch (error) { next(error); } };
