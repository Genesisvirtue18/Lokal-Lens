import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDatabase, disconnectDatabase } from '../../src/config/db.js';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';

const config = { NODE_ENV: 'test', CLIENT_URL: 'http://localhost:5173', JWT_ACCESS_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'b'.repeat(40), JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '7d' };
const signup = (extra = {}) => jwt.sign({ purpose: 'google-signup', gid: 'g-123', email: 'new.person@example.com', name: 'New Person', ...extra }, config.JWT_ACCESS_SECRET, { expiresIn: '10m' });

test('sign-up picks the role, validates the phone number, and Google sign-in follows the same rules', { timeout: 120000 }, async () => {
  const mongo = await MongoMemoryServer.create();
  try {
    await connectDatabase(mongo.getUri('signup_google'));
    const app = createApp(config, { logging: false, rateLimitMax: 1000 });
    const post = (path, body) => request(app).post(`/api/v1${path}`).send(body);

    // Password sign-up: customer by default, owner only when chosen, never admin.
    await post('/auth/register', { name: 'Cust Omer', email: 'cust@example.com', password: 'Passw0rd!x' }).expect(201);
    assert.equal((await User.findOne({ email: 'cust@example.com' })).role, 'customer');
    await post('/auth/register', { name: 'Own Er', email: 'own@example.com', password: 'Passw0rd!x', role: 'business_owner', phone: '+91 98765 43210' }).expect(201);
    const owner = await User.findOne({ email: 'own@example.com' });
    assert.equal(owner.role, 'business_owner');
    assert.equal(owner.phone, '9876543210');
    await post('/auth/register', { name: 'Sneaky', email: 'sneaky@example.com', password: 'Passw0rd!x', role: 'admin' }).expect(400);
    await post('/auth/register', { name: 'Bad Phone', email: 'bad@example.com', password: 'Passw0rd!x', phone: '12345' }).expect(400);
    // A number held by someone who never confirmed their email doesn't block anybody (no squatting by starting sign-ups)...
    await post('/auth/register', { name: 'Takes It Over', email: 'takeover@example.com', password: 'Passw0rd!x', phone: '9876543210' }).expect(201);
    assert.equal((await User.findOne({ email: 'own@example.com' })).phone, undefined, 'released from the unconfirmed account');
    // ...but a confirmed account keeps its number.
    await User.updateOne({ email: 'takeover@example.com' }, { emailVerified: true });
    const dup = await post('/auth/register', { name: 'Dup Phone', email: 'dup@example.com', password: 'Passw0rd!x', phone: '9876543210' }).expect(409);
    assert.match(dup.body.message, /mobile number/);

    // Email-code sign-up: customer by default, and the role can't be admin.
    const noAccount = await post('/auth/otp/request', { email: 'nobody@example.com' }).expect(404);   // signing in doesn't create accounts
    assert.match(noAccount.body.message, /No account found/);
    assert.equal(await User.findOne({ email: 'nobody@example.com' }), null);
    await post('/auth/otp/request', { email: 'otp@example.com', name: 'Otp User', role: 'customer' }).expect(200);
    assert.equal((await User.findOne({ email: 'otp@example.com' })).role, 'customer');
    await post('/auth/otp/request', { email: 'otp2@example.com', role: 'admin' }).expect(400);

    // Google: needs the client ID on the server; a credential and a sign-up token can't be mixed.
    const noId = await post('/auth/google', { credential: 'x'.repeat(40) }).expect(503);
    assert.match(noId.body.message, /isn’t set up/);
    await post('/auth/google', {}).expect(400);
    await post('/auth/google', { credential: 'x'.repeat(40), signupToken: signup() }).expect(400);

    // Finishing a first-time Google sign-up with the chosen role.
    const created = await post('/auth/google', { signupToken: signup(), role: 'business_owner', phone: '9123456780' }).expect(200);
    assert.equal(created.body.data.user.role, 'business_owner');
    assert.equal(created.body.data.user.emailVerified, true);
    assert.equal(created.body.data.user.googleId, undefined, 'the Google id is never sent to the browser');
    assert.ok(created.body.data.accessToken);
    const saved = await User.findOne({ email: 'new.person@example.com' });
    assert.equal(saved.googleId, 'g-123');
    assert.equal(saved.passwordHash, undefined);

    // Signing in again links to the same account; someone else's Google id can't take it over.
    await post('/auth/google', { signupToken: signup() }).expect(200);
    const clash = await post('/auth/google', { signupToken: signup({ gid: 'g-999' }) }).expect(409);
    assert.match(clash.body.message, /different Google account/);

    // Bad or wrongly-purposed tokens, and admins, are refused.
    await post('/auth/google', { signupToken: 'not.a.token'.padEnd(40, 'x') }).expect(401);
    await post('/auth/google', { signupToken: jwt.sign({ purpose: '2fa', email: 'x@example.com' }, config.JWT_ACCESS_SECRET) }).expect(401);
    await User.create({ name: 'Admin Person', email: 'boss@example.com', role: 'admin', emailVerified: true });
    const admin = await post('/auth/google', { signupToken: signup({ email: 'boss@example.com', gid: 'g-admin' }) }).expect(403);
    assert.match(admin.body.message, /Admins sign in with a password/);
  } finally { await disconnectDatabase(); await mongo.stop(); }
});
