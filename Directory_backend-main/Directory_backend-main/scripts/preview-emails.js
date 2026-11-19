// Writes sample versions of every email to tmp/email-previews/ so you can open them in a browser and check the look.
//   node scripts/preview-emails.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromPlainText, renderEmail } from '../src/services/emailTemplate.js';

const out = path.resolve(fileURLToPath(new URL('..', import.meta.url)), 'tmp/email-previews');
fs.mkdirSync(out, { recursive: true });
const appUrl = 'https://lokallens.example';
const samples = {
  '01-sign-in-code': { subject: '482913 is your Lokal Lens code', template: { heading: 'Your Lokal Lens code', preheader: '482913 is your code. It expires in 10 minutes.', paragraphs: ['Enter this code to finish signing in or creating your account.'], code: '482913', codeNote: 'Expires in 10 minutes', note: 'Didn’t ask for this? You can ignore this email, nobody can get in without the code. If you keep getting codes you didn’t ask for, change your password.' } },
  '02-reset-password': { subject: 'Reset your Lokal Lens password', template: { heading: 'Reset your password', preheader: 'Use this link within 1 hour to choose a new password.', paragraphs: ['We received a request to reset the password of your Lokal Lens account. The link works for 1 hour.'], button: { label: 'Choose a new password', url: `${appUrl}/reset-password?token=abc123` }, note: 'Didn’t ask for this? Ignore this email and your password stays as it is.' } },
  '03-claim-code': { subject: '730145 is your code to claim Smile Dental', template: { heading: 'Claim “Smile Dental”', preheader: '730145 is your claim code.', paragraphs: ['Someone asked to manage “Smile Dental” on Lokal Lens. If that is you, enter this code on the claim form.'], code: '730145', codeNote: 'Expires in 10 minutes', note: 'Don’t know about this? Ignore this email. Nothing changes unless the code is used.' } },
  '04-new-inquiry-for-owner': { subject: 'New inquiry for Smile Dental', text: `Jamie Customer sent an inquiry about Smile Dental.\n\nPhone: 98123 45678\nEmail: jamie@example.com\nService: Teeth cleaning\n\nDo you take emergency appointments on Sunday? My tooth hurts since last night.\n\nOpen your dashboard to reply: ${appUrl}/business-owner` },
  '05-inquiry-confirmation': { subject: 'Your inquiry to Smile Dental was sent', text: `Hi Jamie,\n\nWe sent your inquiry to Smile Dental. They will contact you on 9812345678.\n\nYour message:\n\nDo you take emergency appointments on Sunday?\n\nYou can follow it in My account on Lokal Lens.` },
  '06-owner-replied': { subject: 'Smile Dental replied to your inquiry', text: `Hi Jamie,\n\nSmile Dental wrote:\n\nYes, we are open on Sunday from 10 to 2. Please call before you come.\n\nYou can also call them on 9876543210. Your inquiries are in My account on Lokal Lens.` },
  '07-new-review': { subject: 'New 5-star review for Smile Dental', text: `Priya Sharma left a 5-star review for Smile Dental.\n\nGreat dentist, very gentle with my child.\n\nOpen your dashboard to reply: ${appUrl}/business-owner` },
  '08-listing-live': { subject: '“Smile Dental” is now live on Lokal Lens', text: `Good news. “Smile Dental” was approved and is now public. Customers can find it in search.\n\nManage the listing here: ${appUrl}/business-owner` },
  '09-claim-approved': { subject: 'You now manage Smile Dental on Lokal Lens', text: `Your claim for “Smile Dental” was verified.\n\nManage the listing here: ${appUrl}/business-owner` },
  '10-needs-changes': { subject: '“Smile Dental” needs changes before it can go live', text: `We couldn’t approve “Smile Dental” yet.\n\nReason: The phone number looks wrong. Please check and send it again.\n\nOpen your dashboard to fix it: ${appUrl}/business-owner` },
  '11-hostile-input': { subject: 'New inquiry for <b>Bad</b> & Co', text: `<script>alert(1)</script> sent an inquiry about <b>Bad</b> & Co.\n\nPhone: 9812345678\n\n"><img src=x onerror=alert(1)>\n\nOpen your dashboard to reply: ${appUrl}/business-owner` },
};
for (const [name, sample] of Object.entries(samples)) {
  const input = sample.template ? { appUrl, ...sample.template } : fromPlainText(sample.text, { subject: sample.subject, appUrl });
  fs.writeFileSync(path.join(out, `${name}.html`), renderEmail(input));
}
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Email previews</title><body style="font-family:system-ui;padding:24px"><h1>Email previews</h1><ul>${Object.keys(samples).map((name) => `<li><a href="${name}.html">${name}</a></li>`).join('')}</ul></body>`);
console.log(`Wrote ${Object.keys(samples).length} previews to ${out}`);
