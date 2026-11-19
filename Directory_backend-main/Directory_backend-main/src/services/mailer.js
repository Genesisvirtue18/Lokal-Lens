import nodemailer from 'nodemailer';
import { fromPlainText, renderEmail, renderText } from './emailTemplate.js';

// Sends email through SMTP when SMTP_HOST is configured. In development without SMTP the message is logged,
// so codes and links can still be copied from the server console.
// Callers pass either `template` (structured: heading, paragraphs, code, details, button...) or plain `text`;
// both are wrapped in the same branded HTML layout, with a plain-text version alongside.
export function createMailer(config) {
  const transport = config.SMTP_HOST
    ? nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT || 587,
      secure: (config.SMTP_PORT || 587) === 465,
      requireTLS: (config.SMTP_PORT || 587) !== 465, // port 587: always upgrade to an encrypted connection before logging in
      auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
    })
    : null;
  return {
    appUrl: config.CLIENT_URL || '',
    async send({ to, subject, text, html, template }) {
      const input = template ? { appUrl: config.CLIENT_URL, ...template } : fromPlainText(text, { subject, appUrl: config.CLIENT_URL });
      const body = html || renderEmail(input);
      const plain = template ? renderText(input) : text;
      if (!transport) {
        if (config.NODE_ENV === 'production') throw new Error('Email is not configured');
        console.info(`[mail:dev] To: ${to}\nSubject: ${subject}\n${plain}`);
        return { delivered: false };
      }
      await transport.sendMail({ from: config.EMAIL_FROM ? `Lokal Lens <${config.EMAIL_FROM}>` : config.SMTP_USER, to, subject, text: plain, html: body });
      return { delivered: true };
    },
  };
}
