import { AppError } from '../utils/AppError.js';

// Endpoints that act on the refresh cookie only accept requests that come from our own website, so another site can't trigger them.
// Requests without an Origin header (scripts, curl) carry no cookie from a browser and are allowed through.
export const trustedOrigin = (config) => (req, _res, next) => {
  const origin = req.get('origin');
  const allowed = [config.CLIENT_URL, config.CLIENT_URL_2].filter(Boolean);
  if (origin && !allowed.includes(origin)) return next(new AppError('This request isn’t allowed from this site', 403));
  next();
};
