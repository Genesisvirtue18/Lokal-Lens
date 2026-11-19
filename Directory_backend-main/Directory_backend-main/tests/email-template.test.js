import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, fromPlainText, renderEmail, renderText } from '../src/services/emailTemplate.js';

test('codes, buttons and details are rendered, and the plain-text version carries the same content', () => {
  const input = { appUrl: 'https://lokallens.example', heading: 'Your Lokal Lens code', paragraphs: ['Enter this code.'], code: '482913', codeNote: 'Expires in 10 minutes', details: [['Phone', '9812345678']], button: { label: 'Open', url: 'https://lokallens.example/x?a=1&b=2' }, note: 'Ignore if not you.' };
  const html = renderEmail(input);
  assert.match(html, /482913/);
  assert.match(html, /Expires in 10 minutes/);
  assert.match(html, /<a href="https:\/\/lokallens\.example\/x\?a=1&amp;b=2"/, 'link attributes are escaped');
  assert.match(html, /Lokal Lens/);
  const text = renderText(input);
  assert.match(text, /482913/);
  assert.match(text, /Phone: 9812345678/);
  assert.match(text, /Open: https:\/\/lokallens\.example\/x/);
});

test('anything that comes from a person is escaped, and only http(s) links become buttons', () => {
  const html = renderEmail({ heading: '<script>alert(1)</script>', paragraphs: ['<' + 'img src=x onerror=alert(1)>'], quote: '"><svg onload=alert(1)>', details: [['Name', '<b>x</b>']], button: { label: 'Go', url: 'javascript:alert(1)' } });
  assert.equal(/<script|<img |<svg|<b>x/i.test(html), false);
  assert.equal(/javascript:/i.test(html), false, 'a javascript: link is dropped');
  assert.equal(escapeHtml(`a&b<c>"d'`), 'a&amp;b&lt;c&gt;&quot;d&#39;');
});

test('older plain-text emails are turned into the same layout', () => {
  const input = fromPlainText('Jamie sent an inquiry about Smile Dental.\n\nPhone: 9812345678\nEmail: jamie@example.com\n\nDo you open on Sunday?\n\nOpen your dashboard to reply: https://lokallens.example/business-owner', { subject: 'New inquiry for Smile Dental', appUrl: 'https://lokallens.example' });
  assert.equal(input.heading, 'New inquiry for Smile Dental');
  assert.deepEqual(input.details, [['Phone', '9812345678'], ['Email', 'jamie@example.com']]);
  assert.equal(input.quote, 'Do you open on Sunday?');
  assert.equal(input.button.label, 'Open your dashboard');
  assert.match(input.footerNote, /turn email alerts off/);
  const greeting = fromPlainText('Hi Jamie,\n\nWe sent your inquiry.', { subject: 'Sent' });
  assert.equal(greeting.greeting, 'Hi Jamie,');
});
