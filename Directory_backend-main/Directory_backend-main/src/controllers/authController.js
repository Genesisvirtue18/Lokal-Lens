import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';
import { findRefreshToken, issueTokens, revokeRefreshToken } from '../utils/tokens.js';
const publicUser = user => user.toJSON();
export const register = config => async (req, res, next) => { try {
  const { name, email, password } = req.validated.body;
  if (await User.exists({ email })) throw new AppError('An account with this email already exists', 409);
  const displayName = name || email.split('@')[0].replace(/[._-]+/g, ' ').trim().slice(0, 120) || 'Business Owner';
  const user = await User.create({ name: displayName.length >= 2 ? displayName : 'Business Owner', email, role: 'business_owner', passwordHash: await bcrypt.hash(password, 12) });
  const tokens = await issueTokens(user, config, req); sendSuccess(res, 'Registration successful', { user: publicUser(user), ...tokens }, 201);
} catch (e) { next(e); } };
export const login = config => async (req, res, next) => { try {
  const { email, password } = req.validated.body; const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || user.status !== 'active' || !await bcrypt.compare(password, user.passwordHash || '')) throw new AppError('Invalid email or password', 401);
  user.lastLoginAt = new Date(); await user.save(); const tokens = await issueTokens(user, config, req); sendSuccess(res, 'Login successful', { user: publicUser(user), ...tokens });
} catch (e) { next(e); } };
export const refresh = config => async (req, res, next) => { try {
  const session = await findRefreshToken(req.validated.body.refreshToken).populate('user');
  if (!session || session.expiresAt <= new Date() || session.user.status !== 'active') throw new AppError('Invalid refresh token', 401);
  session.revokedAt = new Date(); await session.save(); const tokens = await issueTokens(session.user, config, req); sendSuccess(res, 'Token refreshed', tokens);
} catch (e) { next(e); } };
export const logout = () => async (req, res, next) => { try { await revokeRefreshToken(req.validated.body.refreshToken); sendSuccess(res, 'Logged out successfully'); } catch (e) { next(e); } };
export const me = () => async (req, res, next) => { try { const withHash = await User.findById(req.user.id).select('+passwordHash'); sendSuccess(res, 'Profile retrieved successfully', { user: { ...publicUser(req.user), hasPassword: Boolean(withHash?.passwordHash) } }); } catch (e) { next(e); } };
export const sessions = () => async (req, res, next) => { try { const all = await RefreshToken.find({ user: req.user.id, revokedAt: null, expiresAt: { $gt: new Date() } }).select('-tokenHash').sort({ createdAt: -1 }).lean(); const seen = new Set(); const items = all.filter((item) => { const key = `${item.userAgent || ''}|${item.ip || ''}`; if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 10); sendSuccess(res, 'Sessions retrieved successfully', { items }); } catch (e) { next(e); } };
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
  let user = await User.findOne({ email }).select('+otpHash +otpExpiresAt +otpSentAt');
  if (user && user.status !== 'active') throw new AppError('This account is not active', 403);
  if (user?.otpSentAt && Date.now() - user.otpSentAt.getTime() < 30 * 1000) throw new AppError('Please wait a few seconds before asking for another code.', 429);
  if (!user) {
    const displayName = name || email.split('@')[0].replace(/[._-]+/g, ' ').trim().slice(0, 120);
    user = new User({ name: displayName.length >= 2 ? displayName : 'Business Owner', email, role: 'business_owner' });
  }
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  user.otpHash = otpHash(email, code); user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); user.otpAttempts = 0; user.otpSentAt = new Date();
  await user.save();
  try {
    await mailer.send({ to: email, subject: `${code} is your Lokal Lens code`, text: `Your Lokal Lens sign-in code is ${code}.\n\nIt expires in 10 minutes. If you did not ask for it, you can ignore this email.`, html: `<p>Your Lokal Lens sign-in code is</p><p style="font-size:28px;font-weight:600;letter-spacing:4px">${code}</p><p>It expires in 10 minutes. If you did not ask for it, you can ignore this email.</p>` });
  } catch { console.error('Sign-in code email could not be sent'); }
  // Without SMTP in development the code is also returned so the flow can be tested end to end.
  const devCode = !config.SMTP_HOST && config.NODE_ENV !== 'production' ? code : undefined;
  sendSuccess(res, 'We sent a 6-digit code to your email.', { expiresInSeconds: 600, ...(devCode ? { devCode } : {}) });
} catch (e) { next(e); } };
export const verifyOtp = config => async (req, res, next) => { try {
  const { email, code } = req.validated.body;
  const user = await User.findOne({ email, status: 'active' }).select('+otpHash +otpExpiresAt +otpAttempts');
  if (!user || !user.otpHash || !user.otpExpiresAt || user.otpExpiresAt <= new Date()) throw new AppError('This code has expired. Ask for a new one.', 400);
  if ((user.otpAttempts || 0) >= 5) throw new AppError('Too many wrong codes. Ask for a new one.', 429);
  const expected = Buffer.from(user.otpHash, 'hex'); const given = Buffer.from(otpHash(email, code), 'hex');
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) { user.otpAttempts = (user.otpAttempts || 0) + 1; await user.save(); throw new AppError('That code is not right. Check it and try again.', 400); }
  user.otpHash = undefined; user.otpExpiresAt = undefined; user.otpAttempts = 0; user.emailVerified = true; user.lastLoginAt = new Date();
  await user.save();
  const tokens = await issueTokens(user, config, req); sendSuccess(res, 'Signed in', { user: publicUser(user), ...tokens });
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
  const tokens = await issueTokens(user, config, req);
  sendSuccess(res, hadPassword ? 'Password updated' : 'Password set', tokens);
} catch (e) { next(e); } };
