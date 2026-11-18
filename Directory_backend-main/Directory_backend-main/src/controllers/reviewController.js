import { Business } from '../models/Business.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';

const publicReview = review => {
  const { user, ...rest } = review.toObject ? review.toObject() : review;
  return rest;
};

// Signed-in customers can leave one review per business; posting again edits their earlier review.
export const upsertReview = (config, mailer) => async (req, res, next) => { try {
  const business = await Business.findOne({ _id: req.params.id, listingStatus: 'published', deletedAt: null });
  if (!business) throw new AppError('Business not found', 404);
  if (business.owner && String(business.owner) === String(req.user.id)) throw new AppError('You cannot review your own business', 403);
  const { rating, comment } = req.validated.body;
  const existing = business.reviews.find(review => review.user && String(review.user) === String(req.user.id));
  if (existing) { existing.rating = rating; existing.comment = comment || undefined; existing.reviewerName = req.user.name; }
  else business.reviews.push({ user: req.user.id, reviewerName: req.user.name, rating, comment: comment || undefined });
  await business.save();
  const saved = business.reviews.find(review => review.user && String(review.user) === String(req.user.id));
  // Tell the owner about a brand-new review by email (unless they turned emails off). A mail problem never blocks the review.
  if (!existing && mailer && business.owner) {
    Business.findById(business._id).select('name owner').populate('owner', 'email notificationPreferences').lean().then((full) => {
      const owner = full?.owner;
      if (!owner?.email || owner.notificationPreferences?.email === false) return null;
      const lines = [`${req.user.name} left a ${rating}-star review for ${business.name}.`, ...(comment ? ['', comment] : []), '', `Open your dashboard to reply: ${config?.CLIENT_URL || ''}/business-owner`];
      return mailer.send({ to: owner.email, subject: `New ${rating}-star review for ${business.name}`, text: lines.join('\n') });
    }).catch(() => console.error('Review email could not be sent'));
  }
  sendSuccess(res, existing ? 'Your review was updated' : 'Thanks for your review', { item: publicReview(saved), averageRating: business.averageRating, reviewCount: business.reviewCount }, existing ? 200 : 201);
} catch (e) { next(e); } };

export const listReviews = () => async (req, res, next) => { try {
  const business = await Business.findOne({ _id: req.params.id, listingStatus: 'published', deletedAt: null }).select('reviews averageRating reviewCount').lean();
  if (!business) throw new AppError('Business not found', 404);
  const items = [...(business.reviews || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 50).map(publicReview);
  sendSuccess(res, 'Reviews retrieved successfully', { items, averageRating: business.averageRating, reviewCount: business.reviewCount });
} catch (e) { next(e); } };

export const deleteReview = () => async (req, res, next) => { try {
  const business = await Business.findOne({ _id: req.params.id, deletedAt: null });
  if (!business) throw new AppError('Business not found', 404);
  const review = business.reviews.id(req.params.reviewId);
  if (!review) throw new AppError('Review not found', 404);
  review.deleteOne();
  await business.save();
  sendSuccess(res, 'Review removed', { averageRating: business.averageRating, reviewCount: business.reviewCount });
} catch (e) { next(e); } };
