import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

// Actions that can't be undone from the app (deleting listings, changing roles, handing a listing to someone else…)
// need the admin to type their password again. A stolen sign-in session alone can then not do the damage.
// The browser sends the password in the X-Confirm-Password header; it is never stored or logged.
export const requirePassword = (when = () => true) => async (req, res, next) => {
  try {
    if (!when(req)) return next();
    const given = req.get('x-confirm-password');
    const user = await User.findById(req.user.id).select('+passwordHash +failedLogins +lockedUntil');
    if (!user?.passwordHash) throw new AppError('Set a password under Account settings first. Actions that can’t be undone ask for it.', 403, [{ field: 'password', message: 'PASSWORD_NOT_SET' }]);
    if (user.lockedUntil && user.lockedUntil > new Date()) throw new AppError('Too many wrong passwords. Try again in a few minutes.', 429, [{ field: 'password', message: 'LOCKED' }]);
    if (!given) throw new AppError('Enter your password to confirm this.', 403, [{ field: 'password', message: 'PASSWORD_REQUIRED' }]);
    if (!await bcrypt.compare(given, user.passwordHash)) {
      user.failedLogins = (user.failedLogins || 0) + 1;
      if (user.failedLogins >= 5) { user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); user.failedLogins = 0; }
      await user.save();
      throw new AppError('That password isn’t right.', 403, [{ field: 'password', message: 'PASSWORD_INVALID' }]);
    }
    if (user.failedLogins) { user.failedLogins = 0; await user.save(); }
    next();
  } catch (error) { next(error); }
};
