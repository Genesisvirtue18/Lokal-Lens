import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDatabase, disconnectDatabase } from '../../src/config/db.js';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';

const config = { NODE_ENV: 'test', CLIENT_URL: 'http://localhost:5173', JWT_ACCESS_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'b'.repeat(40), JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '7d' };

test('a mobile number changes only after the code emailed to the account is entered, and never to a number someone else has', { timeout: 120000 }, async () => {
  const mongo = await MongoMemoryServer.create();
  try {
    await connectDatabase(mongo.getUri('phone_change'));
    const app = createApp(config, { logging: false, rateLimitMax: 1000 });
    const tokenFor = (user) => jwt.sign({ sub: String(user._id) }, config.JWT_ACCESS_SECRET, { expiresIn: '10m' });
    const call = (method, path, user, body) => request(app)[method](`/api/v1${path}`).set(user ? { Authorization: `Bearer ${tokenFor(user)}` } : {}).send(body);
    const skipWait = (user) => User.updateOne({ _id: user._id }, { $unset: { phoneChangeSentAt: 1 } });

    const me = await User.create({ name: 'Me Owner', email: 'me@example.com', phone: '9876500021', role: 'business_owner', emailVerified: true });
    await User.create({ name: 'Someone Else', email: 'else@example.com', phone: '9876500022', role: 'customer', emailVerified: true });
    await User.create({ name: 'Never Confirmed', email: 'pending@example.com', phone: '9876500023', role: 'customer', emailVerified: false });

    // The profile form can no longer change the number by itself.
    await call('patch', '/users/me', me, { name: 'Me Renamed' }).expect(200);
    await call('patch', '/users/me', me, { name: 'Me Renamed', phone: '9876500021' }).expect(200);      // same number sent back: fine
    const sneaky = await call('patch', '/users/me', me, { phone: '9876599999' }).expect(400);
    assert.match(sneaky.body.message, /code we email/i);
    assert.equal((await User.findById(me._id)).phone, '9876500021');

    // Asking for the code
    await call('post', '/users/me/phone/request', null, { phone: '9876500030' }).expect(401);
    await call('post', '/users/me/phone/request', me, { phone: '12345' }).expect(400);
    await call('post', '/users/me/phone/request', me, {}).expect(400);
    const own = await call('post', '/users/me/phone/request', me, { phone: '+91 98765 00021' }).expect(400);
    assert.match(own.body.message, /already your/i);
    const taken = await call('post', '/users/me/phone/request', me, { phone: '9876500022' }).expect(409);   // a confirmed account has it
    assert.match(taken.body.message, /already used/i);
    assert.equal((await User.findById(me._id)).phone, '9876500021');

    const asked = await call('post', '/users/me/phone/request', me, { phone: '9876500023' }).expect(200);  // only an unconfirmed sign-up holds it: free
    assert.ok(asked.body.data.devCode);
    await call('post', '/users/me/phone/request', me, { phone: '9876500030' }).expect(429);                 // asking twice quickly
    await skipWait(me);

    // Entering the code
    const second = await call('post', '/users/me/phone/request', me, { phone: '9876500030' }).expect(200);
    const code = second.body.data.devCode;
    assert.notEqual(code, asked.body.data.devCode);
    await call('post', '/users/me/phone/verify', me, { code: code === '000000' ? '111111' : '000000' }).expect(400);
    await call('post', '/users/me/phone/verify', me, { code: '12ab' }).expect(400);
    assert.equal((await User.findById(me._id)).phone, '9876500021', 'still the old number until the right code is entered');
    const done = await call('post', '/users/me/phone/verify', me, { code }).expect(200);
    assert.equal(done.body.data.user.phone, '9876500030');
    assert.equal((await User.findById(me._id)).phone, '9876500030');
    await call('post', '/users/me/phone/verify', me, { code }).expect(400);                                  // a code works once

    // Too many wrong tries, and an expired code
    await skipWait(me);
    const third = await call('post', '/users/me/phone/request', me, { phone: '9876500031' }).expect(200);
    const wrong = third.body.data.devCode === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) await call('post', '/users/me/phone/verify', me, { code: wrong }).expect(400);
    await call('post', '/users/me/phone/verify', me, { code: third.body.data.devCode }).expect(429);
    await skipWait(me);
    const fourth = await call('post', '/users/me/phone/request', me, { phone: '9876500032' }).expect(200);
    await User.updateOne({ _id: me._id }, { phoneChangeExpiresAt: new Date(Date.now() - 1000) });
    await call('post', '/users/me/phone/verify', me, { code: fourth.body.data.devCode }).expect(400);
    assert.equal((await User.findById(me._id)).phone, '9876500030');

    // Someone else took the number between the code being sent and entered
    await skipWait(me);
    const fifth = await call('post', '/users/me/phone/request', me, { phone: '9876500033' }).expect(200);
    await User.create({ name: 'Quick One', email: 'quick@example.com', phone: '9876500033', role: 'customer', emailVerified: true });
    const raced = await call('post', '/users/me/phone/verify', me, { code: fifth.body.data.devCode }).expect(409);
    assert.match(raced.body.message, /already used/i);
    assert.equal((await User.findById(me._id)).phone, '9876500030');
  } finally { await disconnectDatabase(); await mongo.stop(); }
});
