// Sends one test email so you can check the mail settings in .env (MAIL_* or SMTP_*).
//   node scripts/send-test-email.js you@example.com
// It never prints passwords. For Gmail: turn on 2-step verification, create an "App password" at myaccount.google.com/apppasswords,
// and put that 16-letter password in MAIL_PASSWORD (spaces are ignored).
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { parseEnv } from '../src/config/env.js';
import { createMailer } from '../src/services/mailer.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
const to = String(process.argv[2] || '').trim();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) { console.error('Usage: node scripts/send-test-email.js you@example.com'); process.exit(1); }
const config = parseEnv();
console.log(`Host: ${config.SMTP_HOST || 'not set (mail would only be logged)'} | port: ${config.SMTP_PORT || '-'} | user: ${config.SMTP_USER ? 'set' : 'not set'} | password: ${config.SMTP_PASS ? 'set' : 'MISSING'} | from: ${config.EMAIL_FROM || config.SMTP_USER || '-'}`);
if (!config.SMTP_HOST && !config.SMTP2GO_API_KEY) { console.error('Mail is not set up, so nothing can be sent. Fill MAIL_PASSWORD (Gmail App Password) in .env.'); process.exit(1); }
try {
  await createMailer(config).send({ to, subject: 'Lokal Lens test email', text: 'This is a test email from Lokal Lens. If you can read it, sign-in codes and notifications will reach people.' });
  console.log(`Sent. Check the inbox (and spam) of ${to}.`);
} catch (error) {
  console.error(`Could not send: ${error.code || ''} ${String(error.response || error.message).split('\n')[0]}`);
  console.error('Gmail tips: use an App Password (not your normal password), keep 2-step verification on, and make MAIL_FROM the same as MAIL_USERNAME.');
  process.exit(1);
}
