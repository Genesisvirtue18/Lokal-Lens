import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { RefreshToken } from '../models/RefreshToken.js';
import { setRefreshCookie } from './cookies.js';

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const durationMs = value => { const match = /^(\d+)([mhd])$/.exec(value); return match ? Number(match[1]) * ({ m: 6e4, h: 36e5, d: 864e5 }[match[2]]) : 7 * 864e5; };
export const accessToken = (user, config) => jwt.sign({ sub: user.id, role: user.role, pv: user.passwordChangedAt?.getTime() || 0 }, config.JWT_ACCESS_SECRET, { expiresIn: config.JWT_ACCESS_EXPIRES_IN });
export async function issueTokens(user, config, req) {
  const raw = crypto.randomBytes(48).toString('base64url');
  await RefreshToken.create({ user: user.id, tokenHash: hash(raw), expiresAt: new Date(Date.now() + Math.min(durationMs(config.JWT_REFRESH_EXPIRES_IN), ['admin', 'super_admin'].includes(user.role) ? 12 * 36e5 : Infinity)), userAgent: req?.get('user-agent'), ip: req?.ip });
  const ttl = Math.min(durationMs(config.JWT_REFRESH_EXPIRES_IN), ['admin', 'super_admin'].includes(user.role) ? 12 * 36e5 : Infinity);
  return { accessToken: accessToken(user, config), refreshToken: raw, refreshMaxAgeMs: ttl };
}
// Starts a session: the refresh token goes into an httpOnly cookie, the page only receives the short-lived access token.
export async function startSession(res, user, config, req) {
  const { accessToken: access, refreshToken, refreshMaxAgeMs } = await issueTokens(user, config, req);
  setRefreshCookie(res, config, refreshToken, refreshMaxAgeMs);
  return { accessToken: access };
}
// Finds a token even if it was already used. A used token showing up again means it was copied, so every session of that user is ended.
export const findAnyRefreshToken = raw => RefreshToken.findOne({ tokenHash: hash(raw) }).select('+tokenHash');
export const revokeAllFor = userId => RefreshToken.updateMany({ user: userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
export const findRefreshToken = raw => RefreshToken.findOne({ tokenHash: hash(raw), revokedAt: null }).select('+tokenHash');
export const revokeRefreshToken = raw => RefreshToken.updateOne({ tokenHash: hash(raw), revokedAt: null }, { $set: { revokedAt: new Date() } });
