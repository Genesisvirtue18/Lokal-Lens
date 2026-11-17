import mongoose from 'mongoose';
import { Business } from '../models/Business.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';
import { placeMatchesBusiness, safeGooglePlacesError } from '../services/googlePlaces.js';

const isSafeGoogleUrl = value => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'google.com' || url.hostname.endsWith('.google.com') || url.hostname === 'google.co.in' || url.hostname.endsWith('.google.co.in'));
  } catch {
    return false;
  }
};

const mapsUrl = (placeId, providerUri) => isSafeGoogleUrl(providerUri)
  ? providerUri
  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`place_id:${placeId}`)}`;

const emptyResult = (status, mode) => ({
  source: 'google',
  mode,
  status,
  reviewsStatus: mode === 'rating' ? 'not_requested' : 'unavailable',
  available: false,
  rating: null,
  ratingCount: 0,
  reviews: [],
  mapsUri: null,
  attribution: 'Google',
});

export function createGoogleReviewsController(placesService, googleBusinessProfileOrFindBusiness, maybeFindBusiness) {
  const googleBusinessProfile = typeof googleBusinessProfileOrFindBusiness === 'function' ? null : googleBusinessProfileOrFindBusiness;
  const findBusiness = typeof googleBusinessProfileOrFindBusiness === 'function'
    ? googleBusinessProfileOrFindBusiness
    : maybeFindBusiness || (id => Business.findOne({ _id: id, listingStatus: 'published', deletedAt: null }).select('name address owner googlePlaceId googlePlaceVerificationStatus googleBusinessProfileLocation'));
  return async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Invalid business ID', 400);
      const business = await findBusiness(req.params.id);
      if (!business) throw new AppError('Business not found', 404);
      const configuredMode = req.query.mode === 'rating' ? 'rating' : placesService.reviewMode || 'reviews';
      if (googleBusinessProfile && business.googleBusinessProfileLocation && business.owner) {
        const result = await googleBusinessProfile.reviews(business.owner, business.googleBusinessProfileLocation);
        const reviews = result.reviews.map(review => ({ ...review, author: { ...review.author, uri: null } }));
        return sendSuccess(res, 'Google Business Profile reviews retrieved', { google: {
          source: 'google', mode: 'business_profile', status: result.rating !== null || result.ratingCount || reviews.length ? 'available' : 'no_data',
          reviewsStatus: reviews.length ? 'available' : 'no_reviews', available: result.rating !== null || result.ratingCount > 0 || reviews.length > 0,
          rating: result.rating, ratingCount: result.ratingCount, reviews, mapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${business.name} ${business.address?.city || ''}`)}`, attribution: 'Google',
        } });
      }
      if (!business.googlePlaceId) return sendSuccess(res, 'Google reviews are not available for this business', { google: emptyResult('no_place_id', configuredMode) });
      if (business.googlePlaceVerificationStatus === 'mismatch') {
        return sendSuccess(res, 'Google reviews are not available for this business', { google: emptyResult('mismatch', configuredMode) });
      }
      const { place, mode } = configuredMode === 'rating'
        ? await placesService.getRatingDetails(business.googlePlaceId)
        : await placesService.getReviewDetails(business.googlePlaceId);
      if (business.googlePlaceVerificationStatus !== 'verified') {
        const hasMatchDetails = Boolean(place?.displayName?.text && place?.formattedAddress);
        const matches = hasMatchDetails && placeMatchesBusiness(place, business);
        if (!matches) {
          const status = hasMatchDetails ? 'mismatch' : 'unverified';
          business.googlePlaceVerificationStatus = status;
          if (typeof business.save === 'function') await business.save();
          return sendSuccess(res, 'Google reviews are not available for this business', { google: emptyResult(status, mode) });
        }
        business.googlePlaceVerificationStatus = 'verified';
        if (typeof business.save === 'function') await business.save();
      }
      const reviews = mode === 'reviews'
        ? (place.reviews || []).slice(0, 5).map(review => ({
          rating: Number.isFinite(review.rating) ? review.rating : null,
          text: typeof review.text?.text === 'string' ? review.text.text : '',
          relativePublishTimeDescription: typeof review.relativePublishTimeDescription === 'string' ? review.relativePublishTimeDescription : '',
          author: {
            displayName: typeof review.authorAttribution?.displayName === 'string' ? review.authorAttribution.displayName : '',
            uri: isSafeGoogleUrl(review.authorAttribution?.uri) ? review.authorAttribution.uri : null,
            photoUri: isSafeGoogleUrl(review.authorAttribution?.photoUri) ? review.authorAttribution.photoUri : null,
          },
        }))
        : [];
      const rating = Number.isFinite(place.rating) ? place.rating : null;
      const ratingCount = Number.isInteger(place.userRatingCount) ? place.userRatingCount : 0;
      const available = rating !== null || ratingCount > 0 || reviews.length > 0;
      const google = {
        source: 'google',
        mode,
        status: available ? 'available' : 'no_data',
        reviewsStatus: mode === 'rating' ? 'not_requested' : reviews.length ? 'available' : 'no_reviews',
        available,
        rating,
        ratingCount,
        reviews,
        reviewsStatus: mode === 'rating' ? 'not_requested' : reviews.length ? 'available' : 'no_reviews',
        mapsUri: mapsUrl(business.googlePlaceId, place.googleMapsUri),
        attribution: 'Google',
      };
      return sendSuccess(res, available ? 'Google review information retrieved' : 'Google review information is not available', { google });
    } catch (error) {
      if (error?.name === 'GoogleBusinessProfileError') {
        const message = error.code === 'GBP_RECONNECT_REQUIRED' ? 'The business owner needs to reconnect Google Business Profile.' : error.code === 'GBP_ACCESS_DENIED' ? 'Google denied access to this Business Profile.' : error.code === 'GBP_RATE_LIMITED' ? 'Google Business Profile is receiving too many requests. Please try again later.' : 'Google Business Profile reviews are temporarily unavailable.';
        return next(new AppError(message, error.status || 503));
      }
      if (error?.name === 'GooglePlacesError') {
        const [status, message] = safeGooglePlacesError(error);
        return next(new AppError(message, status));
      }
      return next(error);
    }
  };
}
