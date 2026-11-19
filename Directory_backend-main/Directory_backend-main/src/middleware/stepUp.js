import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { checkSecondFactor } from '../utils/secondFactor.js';

// Actions that can't be undone from the app (deleting listings, changing roles, handing a listing to someone else…)
// need a fresh code from the admin's authenticator app. A stolen sign-in session alone can then not do the damage.
// The browser sends the code in the X-Confirm-Code header; it is never stored or logged.
export const requireCode = (config, when = () => true) => async (req, res, next) => {
  try {
    if (!when(req)) return next();
    const user = await User.findById(req.user.id).select('+totpSecretEnc +totpLastStep +totpRecovery +failedLogins +lockedUntil');
    if (!user?.totpEnabled) throw new AppError('Turn on two-step verification under Account & security first. Actions that can’t be undone ask for a code from your authenticator app.', 403, [{ field: 'code', message: 'TOTP_NOT_SET' }]);
    if (user.lockedUntil && user.lockedUntil > new Date()) throw new AppError('Too many wrong codes. Try again in a few minutes.', 429, [{ field: 'code', message: 'LOCKED' }]);
    const given = req.get('x-confirm-code');
    if (!given) throw new AppError('Enter the 6-digit code from your authenticator app.', 403, [{ field: 'code', message: 'CODE_REQUIRED' }]);
    if (!await checkSecondFactor(user, given, config)) throw new AppError('That code isn’t right. Check your authenticator app and try again.', 403, [{ field: 'code', message: 'CODE_INVALID' }]);
    next();
  } catch (error) { next(error); }
};
