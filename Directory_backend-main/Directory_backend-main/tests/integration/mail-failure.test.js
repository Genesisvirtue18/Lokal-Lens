import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDatabase, disconnectDatabase } from '../../src/config/db.js';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';

const config = { NODE_ENV: 'production', TRUST_PROXY: '1', CLIENT_URL: 'https://app.example.com', JWT_ACCESS_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'b'.repeat(40), JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '7d', SMTP2GO_API_KEY: 'api-test', EMAIL_FROM: 'hello@example.com' };

test('in production a code email that cannot be sent is reported (never "we sent a code"), and retrying works at once', { timeout: 120000 }, async () => {
  const realFetch = globalThis.fetch;
  const mongo = await MongoMemoryServer.create();
  try {
    await connectDatabase(mongo.getUri('mail_failure'));
    const app = createApp(config, { logging: false, rateLimitMax: 1000 });
    const signUp = () => request(app).post('/api/v1/auth/otp/request').send({ email: 'new.person@example.com', name: 'New Person', role: 'customer', phone: '9876500041' });

    globalThis.fetch = async () => ({ ok: false, status: 400, json: async () => ({ data: { error: 'The sender is not verified', error_code: 'E_ApiResponseCodes.NON_VALIDATED_SENDER' } }) });
    const failed = await signUp().expect(503);
    assert.match(failed.body.message, /couldn.t send the email/i);
    assert.equal(failed.body.data?.devCode, undefined, 'the code is never shown on screen in production');

    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ data: { succeeded: 1, failed: 0, email_id: 'x' } }) });
    const retried = await signUp().expect(200);     // no "please wait 30 seconds" after a failed send
    assert.equal(retried.body.data.devCode, undefined);
    assert.ok(await User.findOne({ email: 'new.person@example.com' }));
  } finally { globalThis.fetch = realFetch; await disconnectDatabase(); await mongo.stop(); }
});
