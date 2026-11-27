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

const config = { NODE_ENV: 'test', CLIENT_URL: 'http://localhost:5173', CLOUDINARY_CLOUD_NAME: 'demo-cloud', JWT_ACCESS_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'b'.repeat(40), JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '7d' };
const tokenFor = (user) => jwt.sign({ sub: String(user._id) }, config.JWT_ACCESS_SECRET, { expiresIn: '15m' });

test('quote requests, category details, review photos and subcategory filtering', { timeout: 180000 }, async () => {
  const mongo = await MongoMemoryServer.create();
  try {
    await connectDatabase(mongo.getUri('quotes'));
    const [owner, other, customer, admin] = await Promise.all([
      User.create({ name: 'Owner', email: 'owner@example.com', role: 'business_owner', emailVerified: true }),
      User.create({ name: 'Second Owner', email: 'second@example.com', role: 'business_owner', emailVerified: true }),
      User.create({ name: 'Customer', email: 'customer@example.com', role: 'customer', emailVerified: true }),
      User.create({ name: 'Admin', email: 'admin@example.com', role: 'admin', emailVerified: true }),
    ]);
    const education = await Category.create({ name: 'Education', slug: 'education', fields: [{ key: 'fees', label: 'Fee range', type: 'text' }] });
    const schools = await Category.create({ name: 'Schools', slug: 'schools', parentCategory: education._id, fields: [
      { key: 'board', label: 'Board', type: 'multi', options: ['CBSE', 'ICSE'] },
      { key: 'students', label: 'Students', type: 'number', unit: 'students' },
    ] });
    const base = { category: education._id, subcategories: [schools._id], services: ['School admission'], description: 'A school.', phone: '9876543210', address: { addressLine1: '1 Main Road', city: 'Noida', state: 'Uttar Pradesh' }, location: { type: 'Point', coordinates: [77.3, 28.6] }, listingStatus: 'published' };
    const [mine, theirs, unowned, elsewhere] = await Promise.all([
      Business.create({ ...base, name: 'Alpha School', slug: 'alpha-school', owner: owner._id, verificationStatus: 'verified' }),
      Business.create({ ...base, name: 'Beta School', slug: 'beta-school', owner: other._id }),
      Business.create({ ...base, name: 'No Owner School', slug: 'no-owner-school' }),
      Business.create({ ...base, name: 'Delhi School', slug: 'delhi-school', owner: other._id, address: { ...base.address, city: 'Delhi' } }),
    ]);
    const app = createApp(config, { logging: false, rateLimitMax: 100000 });
    const api = (path) => `/api/v1${path}`;
    const as = (user) => ({ post: (p, b) => request(app).post(api(p)).set('Authorization', `Bearer ${tokenFor(user)}`).send(b), patch: (p, b) => request(app).patch(api(p)).set('Authorization', `Bearer ${tokenFor(user)}`).send(b) });

    // ---- who can receive a quote: published, in the city, with a real owner; verified first; no owner details leak
    const matches = (await request(app).get(api('/quotes/matches?category=schools&city=noida')).expect(200)).body.data;
    assert.deepEqual(matches.items.map((item) => item.name), ['Alpha School', 'Beta School']);
    assert.equal(matches.limit, 5);
    assert.ok(!JSON.stringify(matches).includes('@example.com'), 'owner emails never reach the customer');
    assert.equal((await request(app).get(api('/quotes/matches?category=education&city=Delhi')).expect(200)).body.data.total, 1);
    await request(app).get(api('/quotes/matches?category=nothing&city=Noida')).expect(422);
    // An owner asking for quotes does not see their own business.
    const own = (await request(app).get(api('/quotes/matches?category=schools&city=Noida')).set('Authorization', `Bearer ${tokenFor(owner)}`).expect(200)).body.data;
    assert.deepEqual(own.items.map((item) => item.name), ['Beta School']);

    const quote = { category: 'schools', city: 'Noida', name: 'Parent', phone: '9812345678', message: 'Admission for class 2, please call.', businessIds: [String(mine._id), String(theirs._id)], consent: true };
    await request(app).post(api('/quotes')).send({ ...quote, consent: false }).expect(400);
    await request(app).post(api('/quotes')).send({ ...quote, businessIds: [] }).expect(400);
    await request(app).post(api('/quotes')).send({ ...quote, businessIds: Array(6).fill(String(mine._id)) }).expect(400);
    await request(app).post(api('/quotes')).send({ ...quote, businessIds: [String(unowned._id)] }).expect(422);
    await request(app).post(api('/quotes')).send({ ...quote, businessIds: [String(elsewhere._id)] }).expect(422);
    await request(app).post(api('/quotes')).send({ ...quote, phone: '123' }).expect(400);
    assert.equal(await Lead.countDocuments(), 0, 'a refused request reaches nobody');
    const sent = (await request(app).post(api('/quotes')).send(quote).expect(201)).body.data;
    assert.equal(sent.sentTo.length, 2);
    await request(app).post(api('/quotes')).send(quote).expect(201);
    const leads = await Lead.find().lean();
    assert.equal(leads.length, 2, 'sending the same request again does not repeat it');
    assert.ok(leads.every((lead) => lead.source === 'quote' && String(lead.quoteId) === String(leads[0].quoteId)));

    // ---- category details: only known questions and offered options are kept, labels come from the category
    const answers = [
      { key: 'board', values: ['CBSE', 'Made up board'] }, { key: 'students', values: ['800'] }, { key: 'fees', values: ['₹2,000 a month'] },
      { key: 'not_a_question', values: ['x'] }, { key: 'students', values: ['9'] },
    ];
    const created = (await as(owner).post('/owner/businesses', { name: 'Gamma School', category: String(education._id), subcategories: [String(schools._id)], services: ['School admission'], description: 'Another school.', phone: '9876543211', email: 'gamma@example.com', address: { addressLine1: '2 Main Road', city: 'Noida', state: 'Uttar Pradesh' }, attributes: answers }).expect(201)).body.data.item;
    assert.deepEqual(created.attributes.map((entry) => [entry.key, entry.label, entry.values]), [['board', 'Board', ['CBSE']], ['students', 'Students', ['800']], ['fees', 'Fee range', ['₹2,000 a month']]]);
    // On an approved listing a change to the details waits for the admin, like other edits.
    const edit = (await as(owner).patch(`/owner/businesses/${mine._id}`, { attributes: [{ key: 'board', values: ['ICSE'] }] }).expect(200)).body.data;
    assert.equal(edit.sentForReview, true);
    assert.deepEqual(edit.changed, ['Category details']);
    await request(app).patch(api(`/admin/businesses/${mine._id}/changes`)).set('Authorization', `Bearer ${tokenFor(admin)}`).send({ decision: 'approve' }).expect(200);
    const live = (await request(app).get(api('/businesses/alpha-school')).expect(200)).body.data.item;
    assert.deepEqual(live.attributes.map((entry) => entry.values), [['ICSE']]);

    // ---- a subcategory filters the directory
    assert.equal((await request(app).get(api('/businesses?category=schools&city=Noida')).expect(200)).body.data.pagination.totalItems, 3);

    // ---- review photos: only our own uploaded review pictures, at most four
    const ours = 'https://res.cloudinary.com/demo-cloud/image/upload/v1/business-directory/reviews/a.jpg';
    await as(customer).post(`/businesses/${mine._id}/reviews`, { rating: 5, photos: ['https://evil.example.com/track.png'] }).expect(422);
    await as(customer).post(`/businesses/${mine._id}/reviews`, { rating: 5, photos: Array(5).fill(ours) }).expect(400);
    await as(customer).post(`/businesses/${mine._id}/reviews`, { rating: 5, comment: 'Good', photos: [ours] }).expect(201);
    const reviews = (await request(app).get(api(`/businesses/${mine._id}/reviews`)).expect(200)).body.data.items;
    assert.deepEqual(reviews[0].photos, [ours]);
    await request(app).post(api('/reviews/photos')).expect(401);
  } finally {
    await disconnectDatabase();
    await mongo.stop();
  }
});
