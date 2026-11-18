import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';
import jwt from 'jsonwebtoken';
import { findAnyRefreshToken, findRefreshToken, revokeAllFor, revokeRefreshToken, startSession } from '../utils/tokens.js';
import { clearRefreshCookie, readRefreshCookie } from '../utils/cookies.js';
const publicUser = user => user.toJSON();
// Compared against when the email is unknown, so a wrong email and a wrong password take the same time.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);
// Public sign-up with a password. The account can't be used until the email address is confirmed with a code,
// so nobody can register with someone else's address.
export const register = (config, mailer) => async (req, res, next) => { try {
  const { name, email, password } = req.validated.body;
  if (isBlockedTestEmail(config, email)) throw new AppError('This address can’t be used here', 400);
  if (await User.exists({ email })) throw new AppError('An account with this email already exists. Sign in instead.', 409);
  const displayName = name || email.split('@')[0].replace(/[._-]+/g, ' ').trim().slice(0, 120) || 'Business Owner';
  const user = new User({ name: displayName.length >= 2 ? displayName : 'Business Owner', email, role: 'business_owner', passwordHash: await bcrypt.hash(password, 12), emailVerified: false });
  const devCode = await sendCode(user, email, config, mailer);
  sendSuccess(res, 'We sent a 6-digit code to your email. Enter it to finish creating your account.', { expiresInSeconds: 600, ...(devCode ? { devCode } : {}) }, 201);
} catch (e) { next(e); } };

const isBlockedTestEmail = (config, email) => config.NODE_ENV === 'production' && /@lokallens\.test$/i.test(email);
const isAdminRole = (user) => ['admin', 'super_admin'].includes(user.role);

// Creates and emails a 6-digit code. Returns it only in development when no email service is set up.
async function sendCode(user, email, config, mailer, subjectNote = 'Lokal Lens') {
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  user.otpHash = otpHash(email, code); user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); user.otpAttempts = 0; user.otpSentAt = new Date();
  await user.save();
  try { await mailer.send({ to: email, subject: `${code} is your ${subjectNote} code`, text: `Your Lokal Lens code is ${code}.\n\nIt expires in 10 minutes. If you did not ask for it, someone may be trying to use your account. You can ignore this email and change your password.`, html: `<p>Your Lokal Lens code is</p><p style="font-size:28px;font-weight:600;letter-spacing:4px">${code}</p><p>It expires in 10 minutes. If you did not ask for it, you can ignore this email.</p>` }); }
  catch { console.error('Sign-in code email could not be sent'); }
  return !config.SMTP_HOST && config.NODE_ENV !== 'production' ? code : undefined;
}

// Checks a code with the same rules everywhere: expires in 10 minutes, 5 wrong tries, constant-time comparison.
async function checkCode(email, code) {
  const user = await User.findOne({ email, status: 'active' }).select('+otpHash +otpExpiresAt +otpAttempts');
  if (!user || !user.otpHash || !user.otpExpiresAt || user.otpExpiresAt <= new Date()) throw new AppError('This code has expired. Ask for a new one.', 400);
  if ((user.otpAttempts || 0) >= 5) throw new AppError('Too many wrong codes. Ask for a new one.', 429);
  const expected = Buffer.from(user.otpHash, 'hex'); const given = Buffer.from(otpHash(email, code), 'hex');
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) { user.otpAttempts = (user.otpAttempts || 0) + 1; await user.save(); throw new AppError('That code is not right. Check it and try again.', 400); }
  user.otpHash = undefined; user.otpExpiresAt = undefined; user.otpAttempts = 0;
  return user;
}

// Admins must pass two checks: the password, then a code sent to their email. The password step hands back a short-lived
// "challenge" instead of a session, so a stolen password alone is not enough.
export const login = (config, mailer) => async (req, res, next) => { try {
  const { email, password } = req.validated.body;
  if (isBlockedTestEmail(config, email)) throw new AppError('Invalid email or password', 401);
  const user = await User.findOne({ email }).select('+passwordHash +failedLogins +lockedUntil');
  if (user?.lockedUntil && user.lockedUntil > new Date()) throw new AppError('Too many wrong attempts. Try again in a few minutes, or sign in with an email code.', 429);
  const matches = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
  if (!user || user.status !== 'active' || !user.passwordHash || !matches) {
    if (user) { user.failedLogins = (user.failedLogins || 0) + 1; if (user.failedLogins >= 8) { user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); user.failedLogins = 0; } await user.save().catch(() => {}); }
    throw new AppError('Invalid email or password', 401);
  }
  if (!user.emailVerified && !isAdminRole(user)) throw new AppError('Confirm your email first. Choose “Email me a code” to sign in and confirm it.', 403);
  user.failedLogins = 0; user.lockedUntil = undefined;
  if (isAdminRole(user)) {
    const devCode = await sendCode(user, email, config, mailer, 'Lokal Lens admin sign-in');
    const challenge = jwt.sign({ sub: user.id, purpose: '2fa' }, config.JWT_ACCESS_SECRET, { expiresIn: '10m' });
    return sendSuccess(res, 'Enter the code we emailed you to finish signing in.', { requires2fa: true, challenge, ...(devCode ? { devCode } : {}) });
  }
  user.lastLoginAt = new Date(); await user.save();
  sendSuccess(res, 'Login successful', { user: publicUser(user), ...(await startSession(res, user, config, req)) });
} catch (e) { next(e); } };

export const verifyTwoFactor = config => async (req, res, next) => { try {
  const { challenge, code } = req.validated.body;
  let payload; try { payload = jwt.verify(challenge, config.JWT_ACCESS_SECRET); } catch { throw new AppError('This sign-in expired. Start again.', 401); }
  if (payload.purpose !== '2fa') throw new AppError('This sign-in expired. Start again.', 401);
  const holder = await User.findById(payload.sub).select('email role status');
  if (!holder || holder.status !== 'active' || !isAdminRole(holder)) throw new AppError('This sign-in expired. Start again.', 401);
  const user = await checkCode(holder.email, code);
  user.lastLoginAt = new Date(); user.emailVerified = true; await user.save();
  sendSuccess(res, 'Signed in', { user: publicUser(user), ...(await startSession(res, user, config, req)) });
} catch (e) { next(e); } };

// The browser sends the refresh cookie on its own. A token that was already used and shows up again is treated as stolen.
export const refresh = config => async (req, res, next) => { try {
  const raw = readRefreshCookie(req);
  if (!raw) throw new AppError('Please sign in again', 401);
  const session = await findAnyRefreshToken(raw).populate('user');
  if (!session) { clearRefreshCookie(res, config); throw new AppError('Please sign in again', 401); }
  if (session.revokedAt) { if (session.user) await revokeAllFor(session.user._id); clearRefreshCookie(res, config); throw new AppError('Please sign in again', 401); }
  if (session.expiresAt <= new Date() || session.user?.status !== 'active') { clearRefreshCookie(res, config); throw new AppError('Please sign in again', 401); }
  session.revokedAt = new Date(); await session.save();
  sendSuccess(res, 'Token refreshed', await startSession(res, session.user, config, req));
} catch (e) { next(e); } };

export const logout = config => async (req, res, next) => { try {
  const raw = readRefreshCookie(req);
  if (raw) await revokeRefreshToken(raw);
  clearRefreshCookie(res, config);
  sendSuccess(res, 'Logged out successfully');
} catch (e) { next(e); } };
export const me = () => async (req, res, next) => { try { const withHash = await User.findById(req.user.id).select('+passwordHash'); sendSuccess(res, 'Profile retrieved successfully', { user: { ...publicUser(req.user), hasPassword: Boolean(withHash?.passwordHash) } }); } catch (e) { next(e); } };
export const sessions = () => async (req, res, next) => { try { const all = await RefreshToken.find({ user: req.user.id, revokedAt: null, expiresAt: { $gt: new Date() } }).select('-tokenHash').sort({ createdAt: -1 }).lean(); const raw = readRefreshCookie(req); const mine = raw ? await findRefreshToken(raw) : null; const currentId = mine && String(mine.user) === String(req.user.id) ? String(mine._id) : ''; const ordered = currentId ? [...all.filter((item) => String(item._id) === currentId), ...all.filter((item) => String(item._id) !== currentId)] : all; const seen = new Set(); const items = ordered.filter((item) => { const key = `${item.userAgent || ''}|${item.ip || ''}`; if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 10).map((item) => ({ ...item, current: String(item._id) === currentId })); sendSuccess(res, 'Sessions retrieved successfully', { items }); } catch (e) { next(e); } };
export const revokeSession = () => async (req, res, next) => { try { const result = await RefreshToken.updateOne({ _id: req.params.sessionId, user: req.user.id, revokedAt: null }, { $set: { revokedAt: new Date() } }); if (!result.matchedCount) throw new AppError('Session not found', 404); sendSuccess(res, 'Session revoked successfully'); } catch (e) { next(e); } };
export const revokeAll = () => async (req, res, next) => { try { await RefreshToken.updateMany({ user: req.user.id, revokedAt: null }, { $set: { revokedAt: new Date() } }); sendSuccess(res, 'All sessions revoked successfully'); } catch (e) { next(e); } };

const resetHash = value => crypto.createHash('sha256').update(value).digest('hex');
// Always answers with the same message so the form cannot be used to discover which emails have accounts.
export const forgotPassword = (config, mailer) => async (req, res, next) => { try {
  const { email } = req.validated.body;
  const user = await User.findOne({ email, status: 'active' });
  if (user) {
    const token = crypto.randomBytes(32).toString('base64url');
    user.passwordResetTokenHash = resetHash(token);
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    const link = `${config.CLIENT_URL}/reset-password?token=${token}`;
    try {
      await mailer.send({ to: email, subject: 'Reset your Lokal Lens password', text: `We received a request to reset your password.

Open this link within 1 hour to choose a new one:
${link}

If you did not ask for this, you can ignore this email.`, html: `<p>We received a request to reset your Lokal Lens password.</p><p><a href="${link}">Choose a new password</a> (valid for 1 hour).</p><p>If you did not ask for this, you can ignore this email.</p>` });
    } catch { console.error('Password reset email could not be sent'); }
  }
  sendSuccess(res, 'If an account exists for this email, a reset link has been sent.');
} catch (e) { next(e); } };
export const resetPassword = () => async (req, res, next) => { try {
  const { token, password } = req.validated.body;
  const user = await User.findOne({ passwordResetTokenHash: resetHash(token), passwordResetExpiresAt: { $gt: new Date() }, status: 'active' }).select('+passwordResetTokenHash +passwordResetExpiresAt');
  if (!user) throw new AppError('This reset link is invalid or has expired. Request a new one.', 400);
  user.passwordHash = await bcrypt.hash(password, 12);
  user.passwordChangedAt = new Date();
  user.passwordResetTokenHash = undefined; user.passwordResetExpiresAt = undefined;
  await user.save();
  await RefreshToken.updateMany({ user: user.id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  sendSuccess(res, 'Password updated. You can now sign in.');
} catch (e) { next(e); } };

// ---- Email one-time code (OTP) sign in / sign up ----
// The code is 6 digits, valid for 10 minutes and allows 5 wrong attempts. Only a hash is stored.
const otpHash = (email, code) => crypto.createHash('sha256').update(`${email}:${code}`).digest('hex');
export const requestOtp = (config, mailer) => async (req, res, next) => { try {
  const { email, name } = req.validated.body;
  if (isBlockedTestEmail(config, email)) return sendSuccess(res, 'We sent a 6-digit code to your email.', { expiresInSeconds: 600 });
  let user = await User.findOne({ email }).select('+otpHash +otpExpiresAt +otpSentAt');
  if (user && user.status !== 'active') throw new AppError('This account is not active', 403);
  if (user?.otpSentAt && Date.now() - user.otpSentAt.getTime() < 30 * 1000) throw new AppError('Please wait a few seconds before asking for another code.', 429);
  // Admins never sign in with a code alone. Answer the same way, send nothing.
  if (user && isAdminRole(user)) return sendSuccess(res, 'We sent a 6-digit code to your email.', { expiresInSeconds: 600 });
  if (!user) {
    const displayName = name || email.split('@')[0].replace(/[._-]+/g, ' ').trim().slice(0, 120);
    user = new User({ name: displayName.length >= 2 ? displayName : 'Business Owner', email, role: 'business_owner' });
  }
  const devCode = await sendCode(user, email, config, mailer, 'Lokal Lens');
  sendSuccess(res, 'We sent a 6-digit code to your email.', { expiresInSeconds: 600, ...(devCode ? { devCode } : {}) });
} catch (e) { next(e); } };
export const verifyOtp = config => async (req, res, next) => { try {
  const { email, code } = req.validated.body;
  const found = await User.findOne({ email, status: 'active' }).select('role');
  if (found && isAdminRole(found)) throw new AppError('Admins sign in with a password and an emailed code.', 403);
  const user = await checkCode(email, code);
  user.emailVerified = true; user.lastLoginAt = new Date();
  await user.save();
  sendSuccess(res, 'Signed in', { user: publicUser(user), ...(await startSession(res, user, config, req)) });
} catch (e) { next(e); } };

// Change the password (or set one for an account that so far signs in with email codes). Other devices are signed out.
export const changePassword = config => async (req, res, next) => { try {
  const { currentPassword, newPassword } = req.validated.body;
  const user = await User.findById(req.user.id).select('+passwordHash');
  const hadPassword = Boolean(user.passwordHash);
  if (hadPassword && (!currentPassword || !await bcrypt.compare(currentPassword, user.passwordHash))) throw new AppError('Your current password is not right', 400);
  if (hadPassword && currentPassword === newPassword) throw new AppError('Choose a password that is different from the current one', 400);
  user.passwordHash = await bcrypt.hash(newPassword, 12); user.passwordChangedAt = new Date();
  await user.save();
  await RefreshToken.updateMany({ user: user.id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  sendSuccess(res, hadPassword ? 'Password updated' : 'Password set', await startSession(res, user, config, req));
} catch (e) { next(e); } };
