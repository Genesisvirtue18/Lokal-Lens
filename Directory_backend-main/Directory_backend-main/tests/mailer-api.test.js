import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMailer } from '../src/services/mailer.js';
import { parseEnv } from '../src/config/env.js';

const baseEnv = { NODE_ENV: 'production', MONGODB_URI: 'mongodb://127.0.0.1:27017/x', JWT_ACCESS_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'b'.repeat(40), CLIENT_URL: 'https://app.example.com', TRUST_PROXY: '1' };

test('the SMTP2GO web API key is read from the environment', () => {
  const config = parseEnv({ ...baseEnv, SMTP2GO_API_KEY: ' api-123 ', MAIL_FROM: 'hello@example.com' });
  assert.equal(config.SMTP2GO_API_KEY, 'api-123');
  assert.equal(config.EMAIL_FROM, 'hello@example.com');
});

test('mail goes out over HTTPS through SMTP2GO\'s API, and failures are reported', async () => {
  const realFetch = globalThis.fetch;
  const calls = [];
  const answer = (status, body) => async (url, options) => { calls.push({ url, options }); return { ok: status < 400, status, json: async () => body }; };
  try {
    const mailer = createMailer({ NODE_ENV: 'production', CLIENT_URL: 'https://app.example.com', SMTP2GO_API_KEY: 'api-secret', EMAIL_FROM: 'hello@example.com' });

    globalThis.fetch = answer(200, { request_id: 'r1', data: { succeeded: 1, failed: 0, email_id: 'abc' } });
    const result = await mailer.send({ to: 'jamie@example.com', subject: '123456 is your code', template: { heading: 'Your code', paragraphs: ['Enter it.'], code: '123456' } });
    assert.deepEqual(result, { delivered: true });
    assert.equal(calls[0].url, 'https://api.smtp2go.com/v3/email/send');
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[0].options.headers['X-Smtp2go-Api-Key'], 'api-secret');
    const sent = JSON.parse(calls[0].options.body);
    assert.equal(sent.sender, 'Lokal Lens <hello@example.com>');
    assert.deepEqual(sent.to, ['jamie@example.com']);
    assert.equal(sent.subject, '123456 is your code');
    assert.match(sent.html_body, /123456/);
    assert.match(sent.text_body, /123456/);

    globalThis.fetch = answer(400, { data: { error: 'The sender is not verified', error_code: 'E_ApiResponseCodes.NON_VALIDATED_SENDER' } });
    await assert.rejects(() => mailer.send({ to: 'jamie@example.com', subject: 'x', text: 'hi' }), /sender is not verified/);
    globalThis.fetch = answer(200, { data: { succeeded: 0, failed: 1, failures: ['jamie@example.com'] } });
    await assert.rejects(() => mailer.send({ to: 'jamie@example.com', subject: 'x', text: 'hi' }));

    const noFrom = createMailer({ NODE_ENV: 'production', CLIENT_URL: 'https://app.example.com', SMTP2GO_API_KEY: 'api-secret' });
    await assert.rejects(() => noFrom.send({ to: 'jamie@example.com', subject: 'x', text: 'hi' }), /EMAIL_FROM/);
  } finally { globalThis.fetch = realFetch; }
});
