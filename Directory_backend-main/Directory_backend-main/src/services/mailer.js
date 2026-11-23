import nodemailer from 'nodemailer';
import { fromPlainText, renderEmail, renderText } from './emailTemplate.js';

// Sends email through SMTP when SMTP_HOST is configured. In development without SMTP the message is logged,
// so codes and links can still be copied from the server console.
// Callers pass either `template` (structured: heading, paragraphs, code, details, button...) or plain `text`;
// both are wrapped in the same branded HTML layout, with a plain-text version alongside.
// SMTP2GO's web API: the same message, sent over HTTPS (port 443), which no host blocks.
function smtp2goApiTransport(apiKey) {
  return {
    async sendMail({ from, to, subject, text, html }) {
      if (!from) throw new Error('Set EMAIL_FROM (a sender verified in SMTP2GO) to send email');
      const response = await fetch('https://api.smtp2go.com/v3/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Smtp2go-Api-Key': apiKey },
        body: JSON.stringify({ sender: from, to: [to], subject, text_body: text, html_body: html }),
        signal: AbortSignal.timeout(15000),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.data?.error || body?.data?.succeeded === 0) {
        const error = new Error(body?.data?.error || `SMTP2GO answered ${response.status}`);
        error.code = body?.data?.error_code || 'SMTP2GO_API';
        error.responseCode = response.status;
        throw error;
      }
      return { response: `SMTP2GO API ok (${body?.data?.email_id || 'accepted'})`, rejected: [] };
    },
  };
}

export function createMailer(config) {
  const transport = config.SMTP2GO_API_KEY ? smtp2goApiTransport(config.SMTP2GO_API_KEY) : config.SMTP_HOST
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
      const shown = String(to).replace(/^(.).*(@.*)$/, '$1***$2');
      try {
        const info = await transport.sendMail({ from: config.EMAIL_FROM ? `Lokal Lens <${config.EMAIL_FROM}>` : config.SMTP_USER, to, subject, text: plain, html: body });
        console.info(`[mail] handed to the mail server for ${shown}: ${String(info.response || '').slice(0, 70)}${info.rejected?.length ? ` | REJECTED: ${info.rejected.join(',')}` : ''}`);
        return { delivered: true };
      } catch (error) {
        console.error(`[mail] NOT sent to ${shown}: ${error.code || ''} ${error.responseCode || ''} ${String(error.response || error.message).split('\n')[0].slice(0, 160)}`);
        throw error;
      }
    },
  };
}
