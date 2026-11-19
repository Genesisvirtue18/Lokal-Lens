import crypto from 'node:crypto';

// Authenticator-app codes (RFC 6238: 6 digits, 30 seconds, SHA-1), as used by Google Authenticator, Microsoft Authenticator, Authy and 1Password.
// Written with Node's own crypto so no extra package is needed.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buffer) {
  let bits = 0; let value = 0; let out = '';
  for (const byte of buffer) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text) {
  let bits = 0; let value = 0; const out = [];
  for (const char of String(text).toUpperCase().replace(/=+$/, '')) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) continue;
    value = (value << 5) | index; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

export const newTotpSecret = () => base32Encode(crypto.randomBytes(20));

const codeFor = (key, step) => {
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step));
  const digest = crypto.createHmac('sha1', key).update(counter).digest();
  const offset = digest[19] & 0xf;
  const number = ((digest[offset] & 0x7f) << 24) | ((digest[offset + 1] & 0xff) << 16) | ((digest[offset + 2] & 0xff) << 8) | (digest[offset + 3] & 0xff);
  return String(number % 1000000).padStart(6, '0');
};

export const currentTotp = (secret, now = Date.now()) => codeFor(base32Decode(secret), Math.floor(now / 30000));

// Accepts the code of the current 30-second window and one on either side (clock drift). Returns the matching step, or null.
// A step at or below `lastStep` is refused, so the same code can't be used twice.
export function verifyTotp(secret, code, lastStep = 0, now = Date.now()) {
  if (!/^\d{6}$/.test(String(code))) return null;
  const key = base32Decode(secret);
  const step = Math.floor(now / 30000);
  for (const drift of [0, -1, 1]) {
    const candidate = step + drift;
    if (candidate <= lastStep) continue;
    const expected = Buffer.from(codeFor(key, candidate)); const given = Buffer.from(String(code));
    if (crypto.timingSafeEqual(expected, given)) return candidate;
  }
  return null;
}

export const otpauthUrl = (secret, account, issuer = 'Lokal Lens') => `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

// The secret is stored encrypted (AES-256-GCM), so a copy of the database alone can't be used to generate codes.
const vaultKey = (config) => crypto.createHash('sha256').update(`totp-vault:${config.JWT_REFRESH_SECRET}`).digest();
export function sealSecret(config, plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', vaultKey(config), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((part) => part.toString('base64')).join('.');
}
export function openSecret(config, sealed) {
  const [iv, tag, body] = String(sealed).split('.').map((part) => Buffer.from(part, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', vaultKey(config), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
}

// One-time backup codes for a lost phone. Only their hashes are stored.
export const hashRecoveryCode = (code) => crypto.createHash('sha256').update(String(code).trim().toLowerCase().replace(/\s/g, '')).digest('hex');
export function newRecoveryCodes(count = 8) {
  const codes = Array.from({ length: count }, () => { const raw = crypto.randomBytes(5).toString('hex'); return `${raw.slice(0, 5)}-${raw.slice(5)}`; });
  return { codes, hashes: codes.map(hashRecoveryCode) };
}
