import mongoose from 'mongoose';
import { Business } from '../models/Business.js';
import { GoogleBusinessConnection } from '../models/GoogleBusinessConnection.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';
import { GoogleBusinessProfileError } from '../services/googleBusinessProfile.js';

const ownedBusiness = async (req, id) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid business ID', 400);
  const filter = { _id: id, deletedAt: null };
  filter.owner = req.user.id;
  const business = await Business.findOne(filter);
  if (!business) throw new AppError('Business not found', 404);
  return business;
};

const forwardError = (error, next) => {
  if (error instanceof GoogleBusinessProfileError) {
    const messages = {
      GBP_NOT_CONFIGURED: 'Google Business Profile access is not configured by the site administrator.',
      GBP_NOT_CONNECTED: 'Connect a Google Business Profile account first.',
      GBP_RECONNECT_REQUIRED: 'Google authorization expired. Reconnect your Business Profile account.',
      GBP_ACCESS_DENIED: 'Google denied access. Confirm this account manages a verified Business Profile and try again.',
      GBP_RATE_LIMITED: 'Google Business Profile request limit reached. Please try again later.',
      GBP_OAUTH_STATE_INVALID: 'Google authorization expired or could not be verified. Please connect again.',
      GBP_REFRESH_TOKEN_MISSING: 'Google did not provide a refresh token. Disconnect the app from your Google Account and reconnect.',
    };
    return next(new AppError(messages[error.code] || 'Google Business Profile is temporarily unavailable.', error.status || 503));
  }
  return next(error);
};

export function createGoogleBusinessProfileController(service, config) {
  return {
    status: () => async (req, res, next) => { try { sendSuccess(res, 'Google Business Profile connection status retrieved', await service.connectionStatus(req.user.id)); } catch (error) { forwardError(error, next); } },
    connect: () => async (req, res, next) => { try { const url = await service.authorizationUrl(req.user.id); sendSuccess(res, 'Google authorization started', { url }); } catch (error) { forwardError(error, next); } },
    callback: () => async (req, res) => {
      const returnTo = new URL('/business-owner', config.CLIENT_URL);
      try {
        if (req.query.error) throw new GoogleBusinessProfileError('GBP_ACCESS_DENIED', 403);
        if (typeof req.query.code !== 'string' || typeof req.query.state !== 'string') throw new GoogleBusinessProfileError('GBP_OAUTH_STATE_INVALID', 400);
        await service.completeAuthorization(req.query.code, req.query.state);
        returnTo.searchParams.set('googleBusiness', 'connected');
      } catch (error) {
        returnTo.searchParams.set('googleBusiness', 'error');
        returnTo.searchParams.set('reason', error.code || 'GBP_UNAVAILABLE');
      }
      res.redirect(returnTo.toString());
    },
    locations: () => async (req, res, next) => { try { await ownedBusiness(req, req.params.id); const items = await service.locations(req.user.id); sendSuccess(res, 'Google Business Profile locations retrieved', { items }); } catch (error) { forwardError(error, next); } },
    selectLocation: () => async (req, res, next) => {
      try {
        const business = await ownedBusiness(req, req.params.id);
        const locations = await service.locations(req.user.id);
        const location = locations.find(item => item.name === req.validated.body.locationName);
        if (!location) throw new AppError('Choose a location available to the connected Google account.', 422);
        const alreadyLinked = await Business.exists({ _id: { $ne: business._id }, owner: req.user.id, googleBusinessProfileLocation: location.name, deletedAt: null });
        if (alreadyLinked) throw new AppError('This Google location is already linked to another listing in your account.', 409);
        business.googleBusinessProfileLocation = location.name;
        business.googleBusinessProfileTitle = location.title;
        business.googleBusinessProfileLinkedAt = new Date();
        if (location.placeId) business.googlePlaceId = location.placeId;
        business.googlePlaceVerificationStatus = location.placeId ? 'verified' : business.googlePlaceVerificationStatus;
        await business.save();
        sendSuccess(res, 'Google Business Profile location linked', { item: { id: String(business._id), locationName: location.name, title: location.title } });
      } catch (error) { forwardError(error, next); }
    },
    unlinkLocation: () => async (req, res, next) => { try { const business = await ownedBusiness(req, req.params.id); business.googleBusinessProfileLocation = undefined; business.googleBusinessProfileTitle = undefined; business.googleBusinessProfileLinkedAt = undefined; await business.save(); sendSuccess(res, 'Google Business Profile location unlinked'); } catch (error) { forwardError(error, next); } },
    disconnect: () => async (req, res, next) => { try { await GoogleBusinessConnection.deleteOne({ owner: req.user.id }); const listings = await Business.find({ owner: req.user.id }); for (const business of listings) { business.googleBusinessProfileLocation = undefined; business.googleBusinessProfileTitle = undefined; business.googleBusinessProfileLinkedAt = undefined; await business.save(); } sendSuccess(res, 'Google Business Profile disconnected'); } catch (error) { forwardError(error, next); } },
    adminUnlink: () => async (req, res, next) => { try { const business = await Business.findOne({ _id: req.params.id, deletedAt: null }); if (!business) throw new AppError('Business not found', 404); business.googleBusinessProfileLocation = undefined; business.googleBusinessProfileTitle = undefined; business.googleBusinessProfileLinkedAt = undefined; await business.save(); await business.populate([{ path: 'category', select: 'name slug' }, { path: 'owner', select: 'name email' }]); sendSuccess(res, 'Google Business Profile location unlinked by admin', { item: business }); } catch (error) { forwardError(error, next); } },
  };
}
