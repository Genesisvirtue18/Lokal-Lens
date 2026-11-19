// Branded HTML emails. One layout for everything we send: logo bar, a white card, a heading, short paragraphs, an optional code box,
// a details table, a quoted message and one button, then a small footer. Built with tables and inline styles because mail apps
// (Gmail, Outlook, Apple Mail) ignore most modern CSS. Everything that comes from a person or a listing is HTML-escaped.

const BRAND = '#002fa7';
const INK = '#101115';
const BODY = '#2d2f36';
const MUTED = '#6e7079';
const LINE = '#dcdbd5';
const PAPER = '#f1f1ee';
const FONT = "'Poppins',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap';

export const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const safeUrl = (value) => { try { const url = new URL(String(value)); return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''; } catch { return ''; } };
// Turns plain-text URLs inside already-escaped text into links.
const linkify = (escaped) => escaped.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, (match) => `<a href="${match}" style="color:${BRAND};text-decoration:underline;">${match}</a>`);
const paragraphHtml = (text) => `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${BODY};">${linkify(escapeHtml(text)).replace(/\n/g, '<br>')}</p>`;

/**
 * @param {{ heading?: string, preheader?: string, greeting?: string, paragraphs?: string[], code?: string, codeNote?: string,
 *   details?: [string, string][], quote?: string, quoteLabel?: string, button?: { label: string, url: string }, note?: string,
 *   footerNote?: string, appUrl?: string }} input
 */
export function renderEmail(input) {
  const { heading, preheader, greeting, paragraphs = [], code, codeNote, details = [], quote, quoteLabel, button, note, footerNote, appUrl = '' } = input;
  const home = safeUrl(appUrl) || '#';
  const link = button ? safeUrl(button.url) : '';
  const homeAttr = escapeHtml(home); const linkAttr = escapeHtml(link);
  const rows = [];
  if (heading) rows.push(`<h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:600;letter-spacing:-0.3px;color:${INK};">${escapeHtml(heading)}</h1>`);
  if (greeting) rows.push(paragraphHtml(greeting));
  for (const text of paragraphs) rows.push(paragraphHtml(text));
  if (code) {
    rows.push(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 8px;"><tr><td align="center" style="background:#f3f6fd;border:1px solid #cfd9f3;border-radius:12px;padding:20px 12px;">
      <div style="font-family:${FONT};font-size:34px;line-height:40px;font-weight:700;letter-spacing:10px;color:${BRAND};padding-left:10px;">${escapeHtml(code)}</div>
      ${codeNote ? `<div style="margin-top:8px;font-size:13px;line-height:18px;color:${MUTED};">${escapeHtml(codeNote)}</div>` : ''}
    </td></tr></table>`);
  }
  if (details.length) {
    rows.push(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:4px 0 16px;border:1px solid ${LINE};border-radius:12px;border-collapse:separate;">${details.map(([label, value], index) => `<tr><td style="padding:10px 14px;width:34%;font-size:13px;line-height:20px;color:${MUTED};${index ? `border-top:1px solid ${LINE};` : ''}">${escapeHtml(label)}</td><td style="padding:10px 14px;font-size:14px;line-height:20px;color:${INK};font-weight:500;${index ? `border-top:1px solid ${LINE};` : ''}">${escapeHtml(value)}</td></tr>`).join('')}</table>`);
  }
  if (quote) {
    rows.push(`${quoteLabel ? `<div style="margin:0 0 6px;font-size:13px;line-height:18px;color:${MUTED};">${escapeHtml(quoteLabel)}</div>` : ''}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;"><tr><td style="border:1px solid ${LINE};background:#f7f7f4;border-radius:12px;padding:14px 16px;font-size:15px;line-height:24px;color:${BODY};">${escapeHtml(quote).replace(/\n/g, '<br>')}</td></tr></table>`);
  }
  if (button && link) {
    rows.push(`<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 20px;"><tr><td align="center" bgcolor="${BRAND}" style="border-radius:10px;"><a href="${linkAttr}" style="display:inline-block;padding:13px 24px;font-size:15px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(button.label)}</a></td></tr></table>
    <p style="margin:0 0 16px;font-size:12px;line-height:18px;color:${MUTED};">Button not working? Copy this link into your browser:<br><a href="${linkAttr}" style="color:${MUTED};word-break:break-all;">${escapeHtml(link)}</a></p>`);
  }
  if (note) rows.push(`<p style="margin:0;padding-top:16px;border-top:1px solid ${LINE};font-size:13px;line-height:20px;color:${MUTED};">${escapeHtml(note)}</p>`);

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><link href="${FONT_CSS}" rel="stylesheet"><style>@import url(${FONT_CSS});body,td,p,h1,div,a{font-family:${FONT};}</style><title>${escapeHtml(heading || 'Lokal Lens')}</title></head>
<body style="margin:0;padding:0;background:${PAPER};font-family:${FONT};">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${PAPER};font-size:1px;line-height:1px;">${escapeHtml(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${PAPER};font-family:${FONT};"><tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
    <tr><td style="padding:0 4px 16px;">
      <a href="${homeAttr}" style="text-decoration:none;"><table role="presentation" cellspacing="0" cellpadding="0"><tr>
        <td style="width:32px;height:32px;background:${BRAND};border-radius:10px;text-align:center;vertical-align:middle;font-family:${FONT};font-size:17px;font-weight:700;color:#ffffff;">L</td>
        <td style="padding-left:10px;font-family:${FONT};font-size:19px;font-weight:600;letter-spacing:-0.3px;color:${INK};">Lokal Lens</td>
      </tr></table></a>
    </td></tr>
    <tr><td style="background:#ffffff;border:1px solid ${LINE};border-radius:16px;padding:32px 28px;font-family:${FONT};">
      ${rows.join('\n      ')}
    </td></tr>
    <tr><td style="padding:18px 8px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED};text-align:center;">
      ${footerNote ? `${escapeHtml(footerNote)}<br>` : ''}Lokal Lens · find trusted local businesses near you<br>
      ${home !== '#' ? `<a href="${homeAttr}" style="color:${MUTED};">${escapeHtml(home.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>` : ''}
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

/** The same content as plain text (for mail apps that don't show HTML, and for the development log). */
export function renderText(input) {
  const { heading, greeting, paragraphs = [], code, codeNote, details = [], quote, quoteLabel, button, note } = input;
  return [heading, greeting, ...paragraphs, code && `${code}${codeNote ? `  (${codeNote})` : ''}`, details.length && details.map(([label, value]) => `${label}: ${value}`).join('\n'), quote && `${quoteLabel ? `${quoteLabel}\n` : ''}${quote}`, button && `${button.label}: ${button.url}`, note]
    .filter(Boolean).join('\n\n');
}

// ---- Older callers pass plain text. This turns it into the same layout: a "Hi Name," line, paragraphs, "Label: value" lines as a
// details table, a quoted message, and a trailing link as a button.
const URL_LINE = /^(.*?)[:：]?\s*(https?:\/\/\S+)$/;
const KEY_VALUE = /^([A-Z][A-Za-z ]{1,24}):\s+(.+)$/;
export function fromPlainText(text, { subject = '', appUrl = '' } = {}) {
  const blocks = String(text || '').replace(/\r/g, '').split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const input = { heading: subject.replace(/^\d{6}\s+is your\s+/i, 'Your '), preheader: '', paragraphs: [], details: [], appUrl };
  let button;
  blocks.forEach((block, index) => {
    const lines = block.split('\n');
    if (index === 0 && /^(hi|hello|dear)\b/i.test(block) && lines.length === 1) { input.greeting = block; return; }
    const linkLine = lines.length === 1 && URL_LINE.exec(block);
    if (linkLine && !button) {
      const label = linkLine[1].toLowerCase();
      button = { url: linkLine[2], label: /dashboard/.test(label) ? 'Open your dashboard' : /manage|listing/.test(label) ? 'Manage your listing' : /reset|password/.test(label) ? 'Choose a new password' : 'Open Lokal Lens' };
      const lead = linkLine[1].trim();
      if (lead && !/dashboard|manage|reset|password/.test(label)) input.paragraphs.push(lead.replace(/[:：]$/, ''));
      return;
    }
    const pairs = lines.map((line) => KEY_VALUE.exec(line));
    if (lines.length >= 1 && pairs.every(Boolean) && lines.length <= 6) { input.details.push(...pairs.map((pair) => [pair[1], pair[2]])); return; }
    // The paragraph after a details table is the customer's own message: show it as a quote.
    if (input.details.length && !input.quote && index > 0 && lines.length >= 1 && !/^(open|you can|tip|your inquiries)/i.test(block)) { input.quote = block; input.quoteLabel = 'Message'; return; }
    input.paragraphs.push(block);
  });
  if (button) input.button = button;
  if (/\/business-owner\b/.test(String(text))) input.footerNote = 'You get this because you own a listing on Lokal Lens. You can turn email alerts off in Account settings.';
  input.preheader = (input.greeting ? input.paragraphs[0] : input.paragraphs[0]) || input.heading;
  return input;
}
