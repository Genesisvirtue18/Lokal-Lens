import { Business } from '../models/Business.js';
import { ListingReport } from '../models/ListingReport.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';

const MAX_OPEN_PER_PERSON = 10;
const paging = (page, limit, totalItems) => ({ page, limit, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / limit)), hasNextPage: page * limit < totalItems, hasPreviousPage: page > 1 });

// Any signed-in person can report a listing. One open report per person per listing, and a cap so nobody can flood the queue.
export const reportListing = () => async (req, res, next) => { try {
  const business = await Business.findOne({ _id: req.params.id, deletedAt: null, listingStatus: 'published' }).select('_id owner');
  if (!business) throw new AppError('Business not found', 404);
  if (business.owner && String(business.owner) === String(req.user.id)) throw new AppError('This is your own listing. Edit it from your dashboard instead.', 409);
  if (await ListingReport.exists({ business: business._id, reporter: req.user.id, status: 'open' })) throw new AppError('You already reported this listing. Our team will look at it.', 409);
  if (await ListingReport.countDocuments({ reporter: req.user.id, status: 'open' }) >= MAX_OPEN_PER_PERSON) throw new AppError('You have many reports waiting already. Please wait until our team checks them.', 429);
  const { reason, note } = req.validated.body;
  await ListingReport.create({ business: business._id, reporter: req.user.id, reason, ...(note ? { note } : {}) });
  sendSuccess(res, 'Thanks. Our team will check this listing.', {}, 201);
} catch (error) { next(error); } };

export const listListingReports = () => async (req, res, next) => { try {
  const { page, limit, status } = req.validated.query;
  const filter = status === 'all' ? {} : { status: status || 'open' };
  const [items, totalItems] = await Promise.all([
    ListingReport.find(filter).populate({ path: 'business', select: 'name slug listingStatus address.city phone owner', populate: { path: 'owner', select: 'name email' } }).populate('reporter', 'name email').sort('-createdAt').skip((page - 1) * limit).limit(limit).lean(),
    ListingReport.countDocuments(filter),
  ]);
  // Other open reports on the same listing help the admin see a pattern.
  const counts = await ListingReport.aggregate([{ $match: { status: 'open', business: { $in: items.map((item) => item.business?._id).filter(Boolean) } } }, { $group: { _id: '$business', n: { $sum: 1 } } }]);
  const byBusiness = new Map(counts.map((row) => [String(row._id), row.n]));
  sendSuccess(res, 'Listing reports retrieved', { items: items.map((item) => ({ ...item, openOnListing: byBusiness.get(String(item.business?._id)) || 0 })), pagination: paging(page, limit, totalItems) });
} catch (error) { next(error); } };

export const decideListingReport = () => async (req, res, next) => { try {
  const report = await ListingReport.findById(req.params.id);
  if (!report) throw new AppError('Report not found', 404);
  if (report.status !== 'open') throw new AppError('This report was already handled', 409);
  const { action, note } = req.validated.body;
  if (action === 'suspend') {
    const business = await Business.findOne({ _id: report.business, deletedAt: null });
    if (!business) throw new AppError('The business no longer exists', 404);
    if (business.listingStatus === 'published') { business.listingStatus = 'suspended'; await business.save(); }
    // Every other open report on this listing is settled by the same action.
    await ListingReport.updateMany({ business: report.business, status: 'open', _id: { $ne: report._id } }, { $set: { status: 'resolved', action: 'suspended', decisionNote: 'The listing was suspended.', decidedBy: req.user.id, decidedAt: new Date() } });
    report.action = 'suspended';
  }
  report.status = action === 'dismiss' ? 'dismissed' : 'resolved'; report.decisionNote = note || undefined; report.decidedBy = req.user.id; report.decidedAt = new Date();
  await report.save();
  sendSuccess(res, action === 'suspend' ? 'Listing suspended and report closed' : action === 'dismiss' ? 'Report dismissed' : 'Report marked as handled', {});
} catch (error) { next(error); } };
