import { z } from 'zod';

const secret = z.string().min(32).refine(value => !value.startsWith('replace-'), 'Replace the placeholder with a random secret');
const clientOrigin = z.url().refine(value => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && url.origin === value;
  } catch {
    return false;
  }
}, 'Use an HTTP(S) origin without a trailing slash or path');
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\/\S+$/, 'A MongoDB connection URI is required'),
  JWT_ACCESS_SECRET: secret,
  JWT_REFRESH_SECRET: secret,
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: clientOrigin,
  CLIENT_URL_2: clientOrigin.optional(),
  TRUST_PROXY: z.string().default(''),
  COOKIE_SAMESITE: z.enum(['none', 'lax', 'strict']).optional(),
  EMAIL_FROM: z.string().optional(),
  SMTP_HOST: z.string().trim().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_USER: z.string().trim().optional(),
  SMTP_PASS: z.string().optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().min(10).max(100000).default(1000),
  SMS_PROVIDER: z.string().default('development'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  GOOGLE_PLACES_API_KEY: z.string().trim().optional(),
  GOOGLE_PLACES_REVIEW_MODE: z.enum(['rating', 'reviews']).default('reviews'),
  GOOGLE_PLACES_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(20),
  GOOGLE_CLIENT_ID: z.string().trim().optional(),
  // "Continue with Google" on the sign-in page. A Web client ID from Google Cloud (no secret needed).
  GOOGLE_SIGNIN_CLIENT_ID: z.string().trim().optional(),
  GOOGLE_CLIENT_SECRET: z.string().trim().optional(),
  GOOGLE_REDIRECT_URI: z.union([z.literal(''), z.url()]).optional(),
  GOOGLE_TOKEN_ENCRYPTION_KEY: z.union([z.literal(''), z.string().regex(/^[a-fA-F0-9]{64}$/)]).optional(),
}).refine(value => value.JWT_ACCESS_SECRET !== value.JWT_REFRESH_SECRET, {
  path: ['JWT_REFRESH_SECRET'], message: 'Access and refresh secrets must differ',
}).refine(value => value.NODE_ENV !== 'production' || value.TRUST_PROXY.trim() !== '', {
  // Without this, every visitor behind Render's proxy looks like one IP and the rate limits protect nothing.
  path: ['TRUST_PROXY'], message: 'Set TRUST_PROXY=1 in production (the app runs behind a proxy)',
}).refine(value => value.NODE_ENV !== 'production' || value.CLIENT_URL.startsWith('https://'), {
  path: ['CLIENT_URL'], message: 'CLIENT_URL must be https in production',
});

// Mail can be configured with SMTP_* or with the MAIL_* names (MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM).
// MAIL_ENABLED=false switches it off. If a user name is given without a password (a Gmail App Password is needed), mail is treated as
// not set up, so development keeps showing sign-in codes on screen instead of silently failing to send them.
export function withMailAliases(source) {
  const env = { ...source };
  const pick = (...names) => names.map((name) => env[name]).find((value) => typeof value === 'string' && value.trim() !== '');
  const host = pick('SMTP_HOST', 'MAIL_HOST');
  const user = pick('SMTP_USER', 'MAIL_USERNAME');
  const pass = String(pick('SMTP_PASS', 'MAIL_PASSWORD') || '').replace(/\s+/g, '');
  const from = pick('EMAIL_FROM', 'MAIL_FROM');
  const port = pick('SMTP_PORT', 'MAIL_PORT');
  const enabled = String(env.MAIL_ENABLED ?? 'true').toLowerCase() !== 'false';
  delete env.SMTP_HOST; delete env.SMTP_USER; delete env.SMTP_PASS; delete env.SMTP_PORT; delete env.EMAIL_FROM;
  if (from) env.EMAIL_FROM = from.trim();
  if (enabled && host && (!user || pass)) {
    env.SMTP_HOST = host.trim(); if (port) env.SMTP_PORT = port; if (user) env.SMTP_USER = user.trim(); if (pass) env.SMTP_PASS = pass;
  } else if (enabled && host && user && !pass) {
    console.warn('Mail is set up but the password is empty (for Gmail use an App Password). Emails will be logged instead of sent.');
  }
  return env;
}

export function parseEnv(source = process.env) {
  const result = schema.safeParse(withMailAliases(source));
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${result.error.issues.map(issue => `- ${issue.path.join('.')}: ${issue.message}`).join('\n')}`);
  }
  return Object.freeze(result.data);
}
