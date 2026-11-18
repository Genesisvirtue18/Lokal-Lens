// The long-lived refresh token lives in an httpOnly cookie, so a script injected into the page can't read or steal it.
// Only the short-lived access token (15 minutes) is ever visible to page code.
export const REFRESH_COOKIE = 'll_rt';

export function parseCookies(header = '') {
  const out = {};
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    if (!name) continue;
    try { out[name] = decodeURIComponent(part.slice(index + 1).trim()); } catch { /* skip a broken value */ }
  }
  return out;
}

export const readRefreshCookie = (req) => parseCookies(req.headers?.cookie)[REFRESH_COOKIE] || '';

// "none" lets the browser send the cookie from the website to an API on another site (Vercel -> Render);
// use "lax" when both live under one domain (for example lokallens.in and api.lokallens.in).
const sameSite = (config) => config.COOKIE_SAMESITE || (config.NODE_ENV === 'production' ? 'none' : 'lax');
const base = (config) => {
  const mode = sameSite(config);
  return { httpOnly: true, secure: config.NODE_ENV === 'production' || mode === 'none', sameSite: mode, path: '/api/v1/auth' };
};

export function setRefreshCookie(res, config, raw, maxAgeMs) {
  res.cookie(REFRESH_COOKIE, raw, { ...base(config), maxAge: maxAgeMs });
}
export function clearRefreshCookie(res, config) {
  res.clearCookie(REFRESH_COOKIE, base(config));
}
