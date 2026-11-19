import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDatabase, disconnectDatabase } from '../../src/config/db.js';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { Category } from '../../src/models/Category.js';
import { Business } from '../../src/models/Business.js';
import { RefreshToken } from '../../src/models/RefreshToken.js';

const config = { NODE_ENV: 'test', CLIENT_URL: 'http://localhost:5173', JWT_ACCESS_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'b'.repeat(40), JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '7d' };
const tokenFor = (user) => jwt.sign({ sub: String(user._id) }, config.JWT_ACCESS_SECRET, { expiresIn: '15m' });
const cookieOf = (res) => (res.headers['set-cookie'] || []).map((line) => line.split(';')[0]).find((pair) => pair.startsWith('ll_rt='));

test('isolated MongoDB: sign-up needs the emailed code, sessions rotate, roles and admin step-up are enforced', { timeout: 120000 }, async () => {
  const mongo = await MongoMemoryServer.create();
  try {
    await connectDatabase(mongo.getUri('auth_integration'));
    await Promise.all([User.init(), RefreshToken.init()]);
    const placesService = { async verifyPlaceId(placeId) { return placeId === 'ChIJmismatch' ? 'mismatch' : 'verified'; } };
    const app = createApp(config, { logging: false, rateLimitMax: 1000, placesService });
    const api = (method, path) => request(app)[method](`/api/v1${path}`);

    // Sign-up creates no session: the account is unusable until the emailed code is entered.
    const registered = await api('post', '/auth/register').send({ email: 'owner@example.com', password: 'safe-password-123', role: 'business_owner' }).expect(201);
    assert.equal(registered.body.data.accessToken, undefined);
    assert.match(registered.body.data.devCode, /^\d{6}$/);
    await api('post', '/auth/login').send({ email: 'owner@example.com', password: 'safe-password-123' }).expect(403);
    await api('post', '/auth/otp/verify').send({ email: 'owner@example.com', code: registered.body.data.devCode === '000000' ? '111111' : '000000' }).expect(400);
    const verified = await api('post', '/auth/otp/verify').send({ email: 'owner@example.com', code: registered.body.data.devCode }).expect(200);
    assert.equal(verified.body.data.user.role, 'business_owner');
    assert.equal(verified.body.data.user.passwordHash, undefined);
    assert.equal(verified.body.data.refreshToken, undefined, 'the refresh token only travels in the httpOnly cookie');
    const stored = await User.findOne({ email: 'owner@example.com' }).select('+passwordHash');
    assert.notEqual(stored.passwordHash, 'safe-password-123');
    assert.equal(stored.emailVerified, true);
    const ownerToken = verified.body.data.accessToken;

    // Owner creates listings; the Google place check marks matches and mismatches.
    const category = await Category.create({ name: 'Bakery', slug: 'bakery' });
    const listing = { name: 'Example Bakery', description: 'Fresh bread and cakes every day.', category: String(category._id), services: ['Baking'], phone: '9876543210', email: 'owner@example.com', address: { addressLine1: '123 Main Street', city: 'Bengaluru', state: 'Karnataka' } };
    const plain = await api('post', '/owner/businesses').set('Authorization', `Bearer ${ownerToken}`).send(listing).expect(201);
    assert.equal(plain.body.data.item.googlePlaceVerificationStatus, 'unverified');
    const matched = await api('post', '/owner/businesses').set('Authorization', `Bearer ${ownerToken}`).send({ ...listing, name: 'Example Bakery Two', googlePlaceId: 'ChIJabc' }).expect(201);
    assert.equal(matched.body.data.item.googlePlaceVerificationStatus, 'verified');
    const mismatched = await api('post', '/owner/businesses').set('Authorization', `Bearer ${ownerToken}`).send({ ...listing, name: 'Example Bakery Three', googlePlaceId: 'ChIJmismatch' }).expect(201);
    assert.equal(mismatched.body.data.item.googlePlaceVerificationStatus, 'mismatch');

    // Role boundaries: no token is 401, a customer on an owner route is 403, an owner on an admin route is 403.
    const customer = await User.create({ name: 'Customer', email: 'customer@example.com', role: 'customer', emailVerified: true });
    await api('get', '/owner/businesses').expect(401);
    await api('get', '/owner/businesses').set('Authorization', `Bearer ${tokenFor(customer)}`).expect(403);
    await api('get', '/admin/users').set('Authorization', `Bearer ${ownerToken}`).expect(403);

    // Owners can't touch each other's listings.
    const other = await User.create({ name: 'Other Owner', email: 'other@example.com', role: 'business_owner', emailVerified: true });
    await api('patch', `/owner/businesses/${plain.body.data.item._id}`).set('Authorization', `Bearer ${tokenFor(other)}`).send({ description: 'Hijacked listing description.' }).expect(404);
    await api('delete', `/owner/businesses/${plain.body.data.item._id}`).set('Authorization', `Bearer ${tokenFor(other)}`).expect(404);

    // Admin review: a Google-place mismatch can't be approved until it is cleared.
    const admin = await User.create({ name: 'Admin', email: 'admin@example.com', role: 'admin', emailVerified: true });
    const adminToken = tokenFor(admin);
    await api('patch', `/admin/businesses/${mismatched.body.data.item._id}/review`).set('Authorization', `Bearer ${adminToken}`).send({ decision: 'approve' }).expect(422);
    const cleared = await api('patch', `/admin/businesses/${mismatched.body.data.item._id}/google-place`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    assert.equal(cleared.body.data.item.googlePlaceVerificationStatus, 'unverified');
    await api('patch', `/admin/businesses/${mismatched.body.data.item._id}/review`).set('Authorization', `Bearer ${adminToken}`).send({ decision: 'approve' }).expect(200);

    // Irreversible admin actions need an authenticator code; without one set up, or without the code, they are refused.
    const refused = await api('delete', `/admin/businesses/${matched.body.data.item._id}`).set('Authorization', `Bearer ${adminToken}`).expect(403);
    assert.equal(refused.body.errors?.[0]?.message, 'TOTP_NOT_SET');
    assert.ok(await Business.findById(matched.body.data.item._id), 'the listing is still there');

    // Admins can't skip the authenticator by signing in with only a password or an emailed code.
    await User.updateOne({ _id: admin._id }, { passwordHash: (await User.findOne({ email: 'owner@example.com' }).select('+passwordHash')).passwordHash });
    const adminLogin = await api('post', '/auth/login').send({ email: 'admin@example.com', password: 'safe-password-123' }).expect(200);
    assert.equal(adminLogin.body.data.requires2fa, true);
    assert.equal(adminLogin.body.data.accessToken, undefined);
    await api('post', '/auth/otp/request').send({ email: 'admin@example.com' }).expect(200);
    await api('post', '/auth/otp/verify').send({ email: 'admin@example.com', code: '123456' }).expect(403);

    // Sessions: the cookie refreshes and rotates; replaying an old cookie ends the whole session family.
    const login = await api('post', '/auth/login').send({ email: 'owner@example.com', password: 'safe-password-123' }).expect(200);
    const first = cookieOf(login);
    assert.ok(first, 'login sets the refresh cookie');
    const refreshed = await api('post', '/auth/refresh-token').set('Cookie', first).send({}).expect(200);
    const second = cookieOf(refreshed);
    assert.notEqual(second, first);
    await api('post', '/auth/refresh-token').set('Cookie', first).send({}).expect(401);
    await api('post', '/auth/refresh-token').set('Cookie', second).send({}).expect(401);
    await api('post', '/auth/refresh-token').set('Origin', 'https://evil.example').set('Cookie', second).send({}).expect(403);

    const fresh = await api('post', '/auth/login').send({ email: 'owner@example.com', password: 'safe-password-123' }).expect(200);
    await api('post', '/auth/logout').set('Cookie', cookieOf(fresh)).send({}).expect(200);
    await api('post', '/auth/refresh-token').set('Cookie', cookieOf(fresh)).send({}).expect(401);
  } finally { await disconnectDatabase(); await mongo.stop(); }
});
