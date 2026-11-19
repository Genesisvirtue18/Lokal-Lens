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
import { ListingClaim } from '../../src/models/ListingClaim.js';

const config = { NODE_ENV: 'test', CLIENT_URL: 'http://localhost:5173', JWT_ACCESS_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'b'.repeat(40), JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '7d' };
const tokenFor = (user) => jwt.sign({ sub: String(user._id) }, config.JWT_ACCESS_SECRET, { expiresIn: '15m' });

test('claiming a listing: instant for team-added listings, owner notified and able to dispute for owned ones', { timeout: 120000 }, async () => {
  const mongo = await MongoMemoryServer.create();
  try {
    await connectDatabase(mongo.getUri('claims'));
    const [platform, realOwner, claimant, stranger, category] = await Promise.all([
      User.create({ name: 'Platform', email: 'platform@example.com', role: 'business_owner', platformManaged: true }),
      User.create({ name: 'Real Owner', email: 'real@example.com', role: 'business_owner', emailVerified: true }),
      User.create({ name: 'Claimant', email: 'claimant@example.com', role: 'customer', emailVerified: true }),
      User.create({ name: 'Stranger', email: 'stranger@example.com', role: 'business_owner', emailVerified: true }),
      Category.create({ name: 'Cafes', slug: 'cafes' }),
    ]);
    const base = { category: category._id, services: ['Coffee'], listingStatus: 'published', verificationStatus: 'verified', description: 'A friendly neighbourhood cafe.', phone: '9876543210', address: { addressLine1: '1 Main Road', city: 'Pune', state: 'Maharashtra' } };
    const [teamAdded, owned, noEmail] = await Promise.all([
      Business.create({ ...base, name: 'Team Added Cafe', slug: 'team-added-cafe', owner: platform._id, email: 'hello@teamadded.example' }),
      Business.create({ ...base, name: 'Owned Cafe', slug: 'owned-cafe', owner: realOwner._id, email: 'hello@owned.example' }),
      Business.create({ ...base, name: 'No Email Cafe', slug: 'no-email-cafe', owner: platform._id }),
    ]);
    const app = createApp(config, { logging: false, rateLimitMax: 1000 });
    const as = (user) => ({ get: (p) => request(app).get(`/api/v1${p}`).set('Authorization', `Bearer ${tokenFor(user)}`), post: (p, b) => request(app).post(`/api/v1${p}`).set('Authorization', `Bearer ${tokenFor(user)}`).send(b) });
    const claim = { relationship: 'owner', phone: '9876500000', message: 'I run this cafe and want to manage it.' };

    // Anyone must be signed in; the options never reveal the address, only a masked hint.
    await request(app).post(`/api/v1/businesses/${teamAdded._id}/claims`).send(claim).expect(401);
    const options = await as(claimant).get(`/businesses/${teamAdded._id}/claims/options`).expect(200);
    assert.equal(options.body.data.emailCode, true);
    assert.equal(options.body.data.instant, true);
    assert.match(options.body.data.maskedEmail, /^h•+@teamadded\.example$/);
    assert.equal(JSON.stringify(options.body).includes('hello@teamadded.example'), false);

    // A listing with no email can't use the email code.
    await as(claimant).post(`/businesses/${noEmail._id}/claims/code`, {}).expect(422);

    // Wrong code is refused; the right code hands over a team-added listing at once and upgrades a customer to owner.
    const sent = await as(claimant).post(`/businesses/${teamAdded._id}/claims/code`, {}).expect(200);
    const code = sent.body.data.devCode;
    assert.match(code, /^\d{6}$/);
    await as(claimant).post(`/businesses/${teamAdded._id}/claims/code`, {}).expect(429); // too soon for another
    const wrong = await as(claimant).post(`/businesses/${teamAdded._id}/claims`, { ...claim, emailCode: code === '000000' ? '111111' : '000000' }).expect(400);
    assert.match(wrong.body.message, /isn’t right/);
    const instant = await as(claimant).post(`/businesses/${teamAdded._id}/claims`, { ...claim, emailCode: code }).expect(201);
    assert.equal(instant.body.data.item.status, 'approved');
    assert.equal(instant.body.data.item.instant, true);
    assert.equal(String((await Business.findById(teamAdded._id)).owner), String(claimant._id));
    assert.equal((await User.findById(claimant._id)).role, 'business_owner');
    await as(claimant).post(`/businesses/${teamAdded._id}/claims`, claim).expect(409); // it is already theirs

    // The code can't be reused, and five wrong tries lock it.
    const again = await as(stranger).post(`/businesses/${noEmail._id}/claims`, { ...claim, relationship: 'manager' }).expect(422);
    assert.match(again.body.message, /document|code/i);
    const sent2 = await as(stranger).post(`/businesses/${teamAdded._id}/claims/code`, {}).expect(200);
    await request(app).post(`/api/v1/businesses/${teamAdded._id}/claims`).set('Authorization', `Bearer ${tokenFor(stranger)}`).send({ ...claim, emailCode: sent2.body.data.devCode }).expect(201); // team-added no more: owned by claimant now
    assert.equal((await ListingClaim.findOne({ business: teamAdded._id, claimant: stranger._id })).status, 'pending');

    // A listing that already has a real owner is never handed over automatically, even with a valid code.
    const sent3 = await as(stranger).post(`/businesses/${owned._id}/claims/code`, {}).expect(200);
    const pending = await as(stranger).post(`/businesses/${owned._id}/claims`, { ...claim, emailCode: sent3.body.data.devCode }).expect(201);
    assert.equal(pending.body.data.item.status, 'pending');
    assert.equal(String((await Business.findById(owned._id)).owner), String(realOwner._id));
    const saved = await ListingClaim.findById(pending.body.data.item._id);
    assert.ok(saved.ownerNotifiedAt, 'the current owner was told');
    assert.equal(saved.verifiedVia, 'listing_email');
    await as(stranger).post(`/businesses/${owned._id}/claims`, claim).expect(409); // one pending claim per person

    // The current owner sees it (without the claimant's contact details) and can dispute it; nobody else can.
    const incoming = await as(realOwner).get('/owner/incoming-claims').expect(200);
    assert.equal(incoming.body.data.items.length, 1);
    assert.equal(incoming.body.data.items[0].claimantName, 'Stranger');
    assert.equal(JSON.stringify(incoming.body).includes('stranger@example.com'), false);
    assert.equal(JSON.stringify(incoming.body).includes('9876500000'), false);
    await as(stranger).post(`/owner/incoming-claims/${pending.body.data.item._id}/dispute`, { note: 'This person does not run my cafe.' }).expect(404);
    await as(realOwner).post(`/owner/incoming-claims/${pending.body.data.item._id}/dispute`, { note: 'This person does not run my cafe.' }).expect(200);
    assert.match((await ListingClaim.findById(pending.body.data.item._id)).ownerDispute, /does not run/);
    await as(realOwner).post(`/owner/incoming-claims/${pending.body.data.item._id}/dispute`, { note: 'x' }).expect(400);

    // Brute-forcing the six digits stops after five tries.
    const victim = await Business.create({ ...base, name: 'Guarded Cafe', slug: 'guarded-cafe', owner: platform._id, email: 'hi@guarded.example' });
    const sent4 = await as(claimant).post(`/businesses/${victim._id}/claims/code`, {}).expect(200);
    const real = sent4.body.data.devCode; const bad = real === '123456' ? '654321' : '123456';
    for (let i = 0; i < 5; i += 1) await as(claimant).post(`/businesses/${victim._id}/claims`, { ...claim, emailCode: bad }).expect(400);
    await as(claimant).post(`/businesses/${victim._id}/claims`, { ...claim, emailCode: real }).expect(429);
  } finally { await disconnectDatabase(); await mongo.stop(); }
});
