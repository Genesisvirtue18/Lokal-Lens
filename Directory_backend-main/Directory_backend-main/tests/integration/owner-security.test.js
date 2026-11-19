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
import { Lead } from '../../src/models/Lead.js';

const config = { NODE_ENV: 'test', CLIENT_URL: 'http://localhost:5173', JWT_ACCESS_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'b'.repeat(40), JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '7d' };
const tokenFor = (user) => jwt.sign({ sub: String(user._id) }, config.JWT_ACCESS_SECRET, { expiresIn: '15m' });

test('an owner can only change what is theirs, and can never promote themselves or their listing', { timeout: 180000 }, async () => {
  const mongo = await MongoMemoryServer.create();
  try {
    await connectDatabase(mongo.getUri('owner_security'));
    const [mallory, victim, customer, category] = await Promise.all([
      User.create({ name: 'Mallory', email: 'mallory@example.com', role: 'business_owner', emailVerified: true }),
      User.create({ name: 'Victim', email: 'victim@example.com', role: 'business_owner', emailVerified: true }),
      User.create({ name: 'Customer', email: 'customer@example.com', role: 'customer', emailVerified: true }),
      Category.create({ name: 'Cafes', slug: 'cafes' }),
    ]);
    const base = { category: category._id, services: ['Coffee'], description: 'A friendly neighbourhood cafe.', phone: '9876543210', address: { addressLine1: '1 Main Road', city: 'Pune', state: 'Maharashtra' } };
    const mine = await Business.create({ ...base, name: 'Mallory Cafe', slug: 'mallory-cafe', owner: mallory._id, listingStatus: 'pending_review', verificationStatus: 'pending' });
    const theirs = await Business.create({ ...base, name: 'Victim Cafe', slug: 'victim-cafe', owner: victim._id, listingStatus: 'published', verificationStatus: 'verified',
      reviews: [{ user: customer._id, reviewerName: 'Customer', rating: 5, comment: 'Lovely place' }] });
    const lead = await Lead.create({ business: theirs._id, name: 'Jamie', phone: '9812345678', message: 'Do you take bookings?' });
    const app = createApp(config, { logging: false, rateLimitMax: 1000 });
    const me = tokenFor(mallory);
    const call = (method, path, body, token = me) => request(app)[method](`/api/v1${path}`).set('Authorization', `Bearer ${token}`).send(body);

    // 1. Mass assignment on their own listing: nothing privileged can be written.
    const evil = { listingStatus: 'published', verificationStatus: 'verified', kycStatus: 'approved', isFeatured: true, plan: 'premium', planExpiresAt: '2099-01-01', owner: String(victim._id), averageRating: 5, reviewCount: 500, viewCount: 999999, leadCount: 999, slug: 'hacked', deletedAt: null, rejectionReason: 'x', featuredUntil: '2099-01-01' };
    const patched = await call('patch', `/owner/businesses/${mine._id}`, { description: 'Updated description of my cafe.', ...evil });
    assert.ok([200, 400, 422].includes(patched.status), `unexpected ${patched.status}`);
    const after = await Business.findById(mine._id).lean();
    assert.equal(after.listingStatus, 'pending_review', 'cannot publish themselves');
    assert.equal(after.verificationStatus, 'pending', 'cannot verify themselves');
    assert.notEqual(after.kycStatus, 'approved');
    assert.equal(after.isFeatured, false);
    assert.notEqual(after.plan, 'premium');
    assert.equal(String(after.owner), String(mallory._id));
    assert.equal(after.slug, 'mallory-cafe');
    assert.ok(!after.reviewCount, 'cannot invent reviews');
    assert.ok(!after.viewCount && !after.leadCount);

    // 2. Same on creation.
    const created = await call('post', '/owner/businesses', { name: 'Fresh Cafe', description: 'Fresh bread and cakes every day.', category: String(category._id), services: ['Coffee'], phone: '9876543210', email: 'mallory@example.com', address: { addressLine1: '2 Main Road', city: 'Pune', state: 'Maharashtra' }, ...evil });
    if (created.status === 201) {
      const row = await Business.findById(created.body.data.item._id).lean();
      assert.equal(row.listingStatus, 'pending_review', 'new listings always wait for review');
      assert.equal(row.isFeatured, false);
      assert.equal(String(row.owner), String(mallory._id));
      assert.notEqual(row.slug, 'hacked');
    } else assert.ok([400, 422].includes(created.status));

    // 3. Someone else's listing: every owner route behaves as if it doesn't exist.
    await call('get', `/owner/businesses/${theirs._id}`).expect(404);
    await call('patch', `/owner/businesses/${theirs._id}`, { description: 'Defaced by Mallory today.' }).expect(404);
    await call('delete', `/owner/businesses/${theirs._id}`).expect(404);
    await call('post', `/owner/businesses/${theirs._id}/visibility`, { visible: false }).expect(404);
    await call('post', `/owner/businesses/${theirs._id}/submit`, {}).expect(404);
    await call('put', `/owner/businesses/${theirs._id}/reviews/${theirs.reviews[0]._id}/reply`, { text: 'Thanks for nothing' }).expect(404);
    await call('delete', `/owner/businesses/${theirs._id}/reviews/${theirs.reviews[0]._id}/reply`).expect(404);
    await call('get', `/owner/businesses/${theirs._id}/google/locations`).expect(404);
    const victimRow = await Business.findById(theirs._id).lean();
    assert.equal(victimRow.listingStatus, 'published');
    assert.equal(victimRow.description, 'A friendly neighbourhood cafe.');
    assert.equal(victimRow.reviews[0].reply, undefined);

    // 4. Inquiries belong to the listing's owner only.
    const myLeads = await call('get', '/owner/leads?limit=100').expect(200);
    assert.equal(myLeads.body.data.items.length, 0, 'sees none of the victim’s inquiries');
    await call('patch', `/owner/leads/${lead._id}`, { status: 'converted' }).expect(404);
    await call('post', `/owner/leads/${lead._id}/notes`, { note: 'spam' }).expect(404);
    assert.equal((await Lead.findById(lead._id)).status, 'new');

    // 5. Analytics for another owner's listing show nothing (or are refused).
    const analytics = await call('get', `/owner/analytics?days=30&business=${theirs._id}`);
    assert.ok([403, 404].includes(analytics.status) || analytics.body.data.totals.views === 0, 'no data from a listing that is not theirs');

    // 6. Profile: role and other protected fields can't be set through the profile endpoint.
    await call('patch', '/users/me', { role: 'admin' }).expect(400);
    await call('patch', '/users/me', { emailVerified: true, status: 'active', platformManaged: true }).expect(400);
    assert.equal((await User.findById(mallory._id)).role, 'business_owner');

    // 7. Customers and signed-out visitors are kept out of the owner area.
    await call('get', '/owner/businesses', undefined, tokenFor(customer)).expect(403);
    await request(app).get('/api/v1/owner/businesses').expect(401);
    await request(app).get('/api/v1/owner/leads').set('Authorization', 'Bearer not-a-real-token').expect(401);

    // 8. Query-operator injection in public search is rejected or harmless.
    const inj = await request(app).get('/api/v1/businesses?city[$ne]=nothing&q[$regex]=.*');
    assert.ok([200, 400, 422].includes(inj.status));
    if (inj.status === 200) assert.ok(Array.isArray(inj.body.data.items));
    const inj2 = await request(app).post('/api/v1/auth/login').send({ email: { $gt: '' }, password: { $gt: '' } });
    assert.equal(inj2.status, 400);
  } finally { await disconnectDatabase(); await mongo.stop(); }
});
