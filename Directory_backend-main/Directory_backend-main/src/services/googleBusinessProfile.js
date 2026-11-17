import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { GoogleBusinessConnection } from '../models/GoogleBusinessConnection.js';
import { GoogleBusinessOAuthState } from '../models/GoogleBusinessOAuthState.js';
import { Business } from '../models/Business.js';

const OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ACCOUNT_URL = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts';
const LOCATION_URL = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const REVIEW_URL = 'https://mybusiness.googleapis.com/v4';
const SCOPE = 'https://www.googleapis.com/auth/business.manage openid email';

export class GoogleBusinessProfileError extends Error {
  constructor(code, status = 503) { super(code); this.name = 'GoogleBusinessProfileError'; this.code = code; this.status = status; }
}

export function createGoogleBusinessProfileService(config, { fetchImpl = globalThis.fetch } = {}) {
  const isConfigured = Boolean(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET && config.GOOGLE_REDIRECT_URI && config.GOOGLE_TOKEN_ENCRYPTION_KEY);
  const key = isConfigured ? Buffer.from(config.GOOGLE_TOKEN_ENCRYPTION_KEY, 'hex') : null;
  const encrypt = value => {
    const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key, iv);
    const content = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}.${cipher.getAuthTag().toString('hex')}.${content.toString('hex')}`;
  };
  const decrypt = value => {
    const [iv, tag, content] = String(value || '').split('.');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(content, 'hex')), decipher.final()]).toString('utf8');
  };
  const requireConfigured = () => { if (!isConfigured) throw new GoogleBusinessProfileError('GBP_NOT_CONFIGURED'); };
  const api = async (url, accessToken) => {
    let response;
    try { response = await fetchImpl(url, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10000) }); }
    catch { throw new GoogleBusinessProfileError('GBP_UNAVAILABLE'); }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new GoogleBusinessProfileError(response.status === 401 ? 'GBP_RECONNECT_REQUIRED' : response.status === 403 ? 'GBP_ACCESS_DENIED' : response.status === 429 ? 'GBP_RATE_LIMITED' : 'GBP_UNAVAILABLE', response.status === 404 ? 404 : 503);
    return body;
  };
  const tokenCall = async fields => {
    let response;
    try { response = await fetchImpl(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields), signal: AbortSignal.timeout(10000) }); }
    catch { throw new GoogleBusinessProfileError('GBP_UNAVAILABLE'); }
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.access_token) throw new GoogleBusinessProfileError('GBP_TOKEN_EXCHANGE_FAILED');
    return body;
  };
  const findConnection = owner => GoogleBusinessConnection.findOne({ owner }).select('+refreshToken +accessToken');
  const accessTokenFor = async owner => {
    requireConfigured();
    const connection = await findConnection(owner);
    if (!connection) throw new GoogleBusinessProfileError('GBP_NOT_CONNECTED', 404);
    if (connection.accessTokenExpiresAt.getTime() > Date.now() + 60_000) return decrypt(connection.accessToken);
    const refreshed = await tokenCall({ client_id: config.GOOGLE_CLIENT_ID, client_secret: config.GOOGLE_CLIENT_SECRET, refresh_token: decrypt(connection.refreshToken), grant_type: 'refresh_token' });
    connection.accessToken = encrypt(refreshed.access_token);
    connection.accessTokenExpiresAt = new Date(Date.now() + Number(refreshed.expires_in || 3600) * 1000);
    await connection.save();
    return refreshed.access_token;
  };
  return {
    isConfigured,
    async authorizationUrl(owner) {
      requireConfigured();
      const state = randomBytes(32).toString('base64url');
      await GoogleBusinessOAuthState.create({ stateHash: createHash('sha256').update(state).digest('hex'), owner });
      const url = new URL(OAUTH_URL);
      url.search = new URLSearchParams({ client_id: config.GOOGLE_CLIENT_ID, redirect_uri: config.GOOGLE_REDIRECT_URI, response_type: 'code', scope: SCOPE, access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state }).toString();
      return url.toString();
    },
    async completeAuthorization(code, state) {
      requireConfigured();
      const stateHash = createHash('sha256').update(String(state || '')).digest('hex');
      const pending = await GoogleBusinessOAuthState.findOneAndDelete({ stateHash });
      if (!pending) throw new GoogleBusinessProfileError('GBP_OAUTH_STATE_INVALID', 400);
      const token = await tokenCall({ code, client_id: config.GOOGLE_CLIENT_ID, client_secret: config.GOOGLE_CLIENT_SECRET, redirect_uri: config.GOOGLE_REDIRECT_URI, grant_type: 'authorization_code' });
      const profile = await api('https://www.googleapis.com/oauth2/v2/userinfo', token.access_token).catch(() => ({}));
      const prior = await findConnection(pending.owner);
      if (prior?.googleAccountEmail && profile.email && prior.googleAccountEmail !== profile.email.toLowerCase()) {
        await Business.updateMany({ owner: pending.owner }, { $unset: { googleBusinessProfileLocation: 1, googleBusinessProfileTitle: 1, googleBusinessProfileLinkedAt: 1 } });
      }
      const refreshToken = token.refresh_token || (prior ? decrypt(prior.refreshToken) : '');
      if (!refreshToken) throw new GoogleBusinessProfileError('GBP_REFRESH_TOKEN_MISSING');
      await GoogleBusinessConnection.findOneAndUpdate({ owner: pending.owner }, {
        $set: { refreshToken: encrypt(refreshToken), accessToken: encrypt(token.access_token), accessTokenExpiresAt: new Date(Date.now() + Number(token.expires_in || 3600) * 1000), googleAccountEmail: profile.email || prior?.googleAccountEmail || '', connectedAt: new Date() },
      }, { upsert: true, new: true, setDefaultsOnInsert: true });
      return { owner: String(pending.owner), email: profile.email || '' };
    },
    async connectionStatus(owner) {
      const item = await GoogleBusinessConnection.findOne({ owner }).select('googleAccountEmail connectedAt').lean();
      return { connected: Boolean(item), email: item?.googleAccountEmail || '', connectedAt: item?.connectedAt || null, configured: isConfigured };
    },
    async locations(owner) {
      const accessToken = await accessTokenFor(owner);
      const results = [];
      let accountPageToken;
      do {
        const accountUrl = new URL(ACCOUNT_URL);
        accountUrl.searchParams.set('pageSize', '20');
        if (accountPageToken) accountUrl.searchParams.set('pageToken', accountPageToken);
        const accountPage = await api(accountUrl, accessToken);
        for (const account of accountPage.accounts || []) {
          if (!account.name) continue;
          let locationPageToken;
          do {
          const url = new URL(`${LOCATION_URL}/${account.name}/locations`);
          url.searchParams.set('readMask', 'name,title,storefrontAddress,metadata');
          url.searchParams.set('pageSize', '100');
          if (locationPageToken) url.searchParams.set('pageToken', locationPageToken);
          const page = await api(url, accessToken);
          for (const location of page.locations || []) results.push({ name: location.name, title: location.title, address: location.storefrontAddress?.addressLines?.join(', ') || '', locality: location.storefrontAddress?.locality || '', regionCode: location.storefrontAddress?.regionCode || '', placeId: location.metadata?.placeId || '' });
          locationPageToken = page.nextPageToken;
          } while (locationPageToken && results.length < 500);
          if (results.length >= 500) break;
        }
        accountPageToken = accountPage.nextPageToken;
      } while (accountPageToken && results.length < 500);
      return results.filter(location => location.name && location.title);
    },
    async reviews(owner, locationName) {
      const accessToken = await accessTokenFor(owner);
      const url = new URL(`${REVIEW_URL}/${locationName}/reviews`);
      url.searchParams.set('pageSize', '50');
      url.searchParams.set('orderBy', 'updateTime desc');
      const result = await api(url, accessToken);
      return {
        rating: Number.isFinite(result.averageRating) ? result.averageRating : null,
        ratingCount: Number.isInteger(result.totalReviewCount) ? result.totalReviewCount : 0,
          reviews: (result.reviews || []).slice(0, 5).map(review => ({ rating: ({ ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 })[review.starRating] || null, text: review.comment || '', relativePublishTimeDescription: review.updateTime || review.createTime || '', author: { displayName: review.reviewer?.displayName || '', uri: null, photoUri: review.reviewer?.profilePhotoUrl || null } })),
      };
    },
    async disconnect(owner) {
      const connection = await findConnection(owner);
      if (connection) {
        try { await fetchImpl('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: decrypt(connection.refreshToken) }), signal: AbortSignal.timeout(5000) }); } catch { /* Local access is removed even if Google's revocation endpoint is unreachable. */ }
      }
      await GoogleBusinessConnection.deleteOne({ owner });
    },
  };
}
