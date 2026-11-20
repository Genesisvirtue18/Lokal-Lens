import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDatabase, disconnectDatabase } from '../../src/config/db.js';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';

const config = { NODE_ENV: 'test', CLIENT_URL: 'http://localhost:5173', JWT_ACCESS_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'b'.repeat(40), JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '7d' };

test('an account that was removed can sign up again with the same email, starting fresh', { timeout: 120000 }, async () => {
  const mongo = await MongoMemoryServer.create();
  try {
    await connectDatabase(mongo.getUri('revive'));
    const app = createApp(config, { logging: false, rateLimitMax: 100000 });
    const post = (path, body) => request(app).post(`/api/v1${path}`).send(body);
    const removed = (extra = {}) => ({ status: 'deleted', deletedAt: new Date(), emailVerified: true, passwordHash: bcrypt.hashSync('old-password-123', 4), totpEnabled: false, ...extra });

    // Email-code sign-up on a removed account: allowed, details replaced, old password wiped, code proves ownership.
    await User.create({ name: 'Old Name', email: 'back@example.com', role: 'business_owner', phone: '9000000001', ...removed() });
    const code = await post('/auth/otp/request', { email: 'back@example.com', name: 'New Person', role: 'customer', phone: '9000000002' }).expect(200);
    assert.match(code.body.data.devCode, /^\d{6}$/);
    const fresh = await User.findOne({ email: 'back@example.com' }).select('+passwordHash');
    assert.equal(fresh.status, 'active');
    assert.equal(fresh.name, 'New Person');
    assert.equal(fresh.role, 'customer');
    assert.equal(fresh.phone, '9000000002');
    assert.equal(fresh.emailVerified, false, 'must prove the email again');
    assert.equal(fresh.passwordHash, undefined, 'the old password is gone');
    const session = await post('/auth/otp/verify', { email: 'back@example.com', code: code.body.data.devCode }).expect(200);
    assert.equal(session.body.data.user.name, 'New Person');
    assert.equal(await User.countDocuments({ email: 'back@example.com' }), 1, 'same record, no duplicate');

    // An unconfirmed sign-up can be redone with different details (the form sends a role); a plain sign-in request does not change it.
    await post('/auth/otp/request', { email: 'redo@example.com', name: 'First Try', role: 'customer', phone: '9000000008' }).expect(200);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await User.updateOne({ email: 'redo@example.com' }, { $unset: { otpSentAt: 1 } });
    await post('/auth/otp/request', { email: 'redo@example.com', name: 'Second Try', role: 'business_owner', phone: '9000000009' }).expect(200);
    let redo = await User.findOne({ email: 'redo@example.com' });
    assert.equal(redo.name, 'Second Try');
    assert.equal(redo.role, 'business_owner');
    assert.equal(redo.phone, '9000000009');
    await User.updateOne({ email: 'redo@example.com' }, { $unset: { otpSentAt: 1 } });
    await request(app).post('/api/v1/auth/otp/request').send({ email: 'redo@example.com' }).expect(404);   // sign-in tab: an unfinished sign-up is not an account yet
    redo = await User.findOne({ email: 'redo@example.com' });
    assert.equal(redo.name, 'Second Try', 'a sign-in request leaves the details alone');
    assert.equal(redo.role, 'business_owner');

    // Password sign-up on a removed account.
    await User.create({ name: 'Gone', email: 'gone@example.com', role: 'business_owner', ...removed() });
    await post('/auth/register', { name: 'Fresh Owner', email: 'gone@example.com', password: 'brand-new-pass-1', role: 'business_owner', phone: '9000000003' }).expect(201);
    await post('/auth/login', { email: 'gone@example.com', password: 'old-password-123' }).expect(401); // the old password no longer works
    await post('/auth/login', { email: 'gone@example.com', password: 'brand-new-pass-1' }).expect(403); // the new one works only after the email is confirmed
    const after = await User.findOne({ email: 'gone@example.com' });
    assert.equal(after.name, 'Fresh Owner');
    assert.equal(after.status, 'active');

    // A live account still can't be taken over, a suspended one stays blocked, and a removed admin is never revived this way.
    await post('/auth/register', { name: 'Thief', email: 'back@example.com', password: 'whatever-pass-12', role: 'customer' }).expect(409);
    await User.create({ name: 'Banned', email: 'banned@example.com', role: 'customer', status: 'suspended', emailVerified: true });
    await post('/auth/otp/request', { email: 'banned@example.com', role: 'customer' }).expect(403);
    await User.create({ name: 'Old Admin', email: 'oldadmin@example.com', role: 'admin', ...removed() });
    await post('/auth/register', { name: 'Impostor', email: 'oldadmin@example.com', password: 'impostor-pass-12', role: 'customer' }).expect(409);
    assert.equal((await User.findOne({ email: 'oldadmin@example.com' })).role, 'admin');

    // Google sign-up on a removed account goes through the same "customer or owner?" step, then starts fresh.
    await User.create({ name: 'Old G', email: 'gg@example.com', role: 'business_owner', googleId: 'old-google-id', ...removed() });
    const token = (extra = {}) => jwt.sign({ purpose: 'google-signup', gid: 'new-google-id', email: 'gg@example.com', name: 'Google Person', ...extra }, config.JWT_ACCESS_SECRET, { expiresIn: '10m' });
    const done = await post('/auth/google', { signupToken: token(), role: 'customer', phone: '9000000007' }).expect(200);
    assert.equal(done.body.data.user.role, 'customer');
    const g = await User.findOne({ email: 'gg@example.com' });
    assert.equal(g.status, 'active');
    assert.equal(g.googleId, 'new-google-id');
    assert.equal(g.emailVerified, true);
  } finally { await disconnectDatabase(); await mongo.stop(); }
});
