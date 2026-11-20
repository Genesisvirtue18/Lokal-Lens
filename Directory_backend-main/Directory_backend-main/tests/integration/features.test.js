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

test('re-review on sensitive edits, owner replies, withdrawing an inquiry, and listing reports', { timeout: 180000 }, async () => {
  const mongo = await MongoMemoryServer.create();
  try {
    await connectDatabase(mongo.getUri('features'));
    const [owner, customer, other, admin, cat1, cat2] = await Promise.all([
      User.create({ name: 'Owner', email: 'owner@example.com', role: 'business_owner', emailVerified: true }),
      User.create({ name: 'Customer', email: 'customer@example.com', role: 'customer', emailVerified: true }),
      User.create({ name: 'Other Customer', email: 'other@example.com', role: 'customer', emailVerified: true }),
      User.create({ name: 'Admin', email: 'admin@example.com', role: 'admin', emailVerified: true }),
      Category.create({ name: 'Health', slug: 'health' }),
      Category.create({ name: 'Food', slug: 'food' }),
    ]);
    const base = { category: cat1._id, services: ['Checkup'], description: 'A friendly neighbourhood clinic.', phone: '9876543210', email: 'clinic@example.com', address: { addressLine1: '1 Main Road', city: 'Pune', state: 'Maharashtra' }, listingStatus: 'published', verificationStatus: 'verified' };
    const clinic = await Business.create({ ...base, name: 'City Clinic', slug: 'city-clinic', owner: owner._id });
    const app = createApp(config, { logging: false, rateLimitMax: 100000 });
    const as = (user) => ({ get: (p) => request(app).get(`/api/v1${p}`).set('Authorization', `Bearer ${tokenFor(user)}`), post: (p, b) => request(app).post(`/api/v1${p}`).set('Authorization', `Bearer ${tokenFor(user)}`).send(b), patch: (p, b) => request(app).patch(`/api/v1${p}`).set('Authorization', `Bearer ${tokenFor(user)}`).send(b), del: (p) => request(app).delete(`/api/v1${p}`).set('Authorization', `Bearer ${tokenFor(user)}`) });
    const publicStatus = async () => (await request(app).get('/api/v1/businesses/city-clinic')).status;

    // The city filter ignores capitals, because city pages live at lower-case URLs like /pune/health.
    for (const spelling of ['Pune', 'pune', 'PUNE']) assert.equal((await request(app).get(`/api/v1/businesses?city=${spelling}`).expect(200)).body.data.pagination.totalItems, 1, spelling);

    // ---- 1. Edits to an approved listing wait for an admin; the public page keeps showing what was approved
    const same = await as(owner).patch(`/owner/businesses/${clinic._id}`, { description: 'A friendly neighbourhood clinic.' }).expect(200);
    assert.equal(same.body.data.sentForReview, false, 'saving the same text is not a change');
    const evening = 'A friendly neighbourhood clinic with evening hours.';
    const harmless = await as(owner).patch(`/owner/businesses/${clinic._id}`, { description: evening }).expect(200);
    assert.equal(harmless.body.data.sentForReview, true);
    assert.deepEqual(harmless.body.data.changed, ['Description']);
    assert.match(harmless.body.message, /approval/i);
    let live = await Business.findById(clinic._id).select('+pendingChanges').lean();
    assert.equal(live.description, 'A friendly neighbourhood clinic.', 'the live description is untouched');
    assert.equal(live.listingStatus, 'published', 'the listing stays live');
    assert.equal(live.pendingChanges.status, 'pending');
    assert.equal(live.pendingChanges.data.description, evening);
    assert.equal(await publicStatus(), 200);
    const publicText = JSON.stringify((await request(app).get('/api/v1/businesses/city-clinic').expect(200)).body);
    assert.ok(publicText.includes('A friendly neighbourhood clinic.') && !publicText.includes('evening hours'), 'customers still see the approved text');
    const ownerView = await as(owner).get(`/owner/businesses/${clinic._id}`).expect(200);
    assert.equal(ownerView.body.data.item.pendingChanges.data.description, evening, 'the owner can see and keep editing what is waiting');

    // more edits pile up; setting a field back to what is live cancels it
    const more = await as(owner).patch(`/owner/businesses/${clinic._id}`, { name: 'City Care Clinic', phone: '9876500000', category: String(cat2._id) }).expect(200);
    assert.deepEqual(more.body.data.changed.sort(), ['Business name', 'Category', 'Description', 'Phone']);
    assert.equal((await Business.findById(clinic._id)).name, 'City Clinic');
    await as(owner).patch(`/owner/businesses/${clinic._id}`, { phone: '9876543210' }).expect(200);
    live = await Business.findById(clinic._id).select('+pendingChanges').lean();
    assert.deepEqual(Object.keys(live.pendingChanges.data).sort(), ['category', 'description', 'name']);

    // only an admin decides
    await as(owner).patch(`/admin/businesses/${clinic._id}/changes`, { decision: 'approve' }).expect(403);
    await as(customer).patch(`/admin/businesses/${clinic._id}/changes`, { decision: 'approve' }).expect(403);
    const adminView = await as(admin).get(`/admin/businesses/${clinic._id}`).expect(200);
    assert.equal(adminView.body.data.item.pendingChanges.data.name, 'City Care Clinic');
    assert.equal(adminView.body.data.item.name, 'City Clinic', 'the admin sees both what is live and what is asked');
    await as(admin).patch(`/admin/businesses/${clinic._id}/changes`, { decision: 'reject' }).expect(422);   // the owner must be told what to fix
    await as(admin).patch(`/admin/businesses/${clinic._id}/changes`, { decision: 'reject', reason: 'The new name looks like another business.' }).expect(200);
    live = await Business.findById(clinic._id).select('+pendingChanges').lean();
    assert.equal(live.name, 'City Clinic');
    assert.equal(live.pendingChanges.status, 'rejected');
    assert.match(live.pendingChanges.rejectionReason, /another business/);
    await as(admin).patch(`/admin/businesses/${clinic._id}/changes`, { decision: 'approve' }).expect(404);   // nothing waiting any more
    const again = await as(owner).patch(`/owner/businesses/${clinic._id}`, { name: 'City Care Clinic' }).expect(200);   // fixing and sending again
    assert.equal(again.body.data.sentForReview, true);
    assert.equal((await Business.findById(clinic._id).select('+pendingChanges').lean()).pendingChanges.status, 'pending');
    await as(admin).patch(`/admin/businesses/${clinic._id}/changes`, { decision: 'approve' }).expect(200);
    live = await Business.findById(clinic._id).select('+pendingChanges').lean();
    assert.equal(live.name, 'City Care Clinic');
    assert.equal(live.description, evening);
    assert.equal(String(live.category), String(cat2._id));
    assert.equal(live.phone, '9876543210');
    assert.equal(live.pendingChanges, undefined, 'nothing is left waiting');
    assert.equal(live.listingStatus, 'published');
    assert.equal(await publicStatus(), 200);
    const phone = await as(owner).patch(`/owner/businesses/${clinic._id}`, { phone: '9876500000' }).expect(200);
    assert.deepEqual(phone.body.data.changed, ['Phone']);
    await as(admin).patch(`/admin/businesses/${clinic._id}/changes`, { decision: 'approve' }).expect(200);
    assert.equal((await Business.findById(clinic._id)).phone, '9876500000');

    // ---- 2. Inquiry, owner reply, customer sees it, withdraw
    const sent = await as(customer).post(`/businesses/${clinic._id}/leads`, { name: 'Customer', phone: '9811111111', message: 'Do you open on Sunday?' }).expect(201);
    const leadId = sent.body.data.item.id;
    await as(other).post(`/owner/leads/${leadId}/reply`, { text: 'Hello from a stranger' }).expect(403);
    await as(owner).post(`/owner/leads/${leadId}/reply`, { text: 'x' }).expect(400);
    const replied = await as(owner).post(`/owner/leads/${leadId}/reply`, { text: 'Yes, we open from 10 to 2 on Sundays.' }).expect(200);
    assert.equal(replied.body.data.item.status, 'contacted');
    const mine = await as(customer).get('/users/me/inquiries').expect(200);
    assert.equal(mine.body.data.items[0].replies[0].text, 'Yes, we open from 10 to 2 on Sundays.');
    assert.equal(mine.body.data.items[0].withdrawn, false);
    assert.equal(JSON.stringify(mine.body).includes('notes'), false, 'private notes never reach the customer');
    await as(other).del(`/users/me/inquiries/${leadId}`).expect(404);
    await as(customer).del(`/users/me/inquiries/${leadId}`).expect(200);
    assert.ok((await Lead.findById(leadId)).withdrawnAt);
    const withdrawn = await as(owner).post(`/owner/leads/${leadId}/reply`, { text: 'Are you still there?' }).expect(409);
    assert.match(withdrawn.body.message, /withdrew/);
    const ownerSees = await as(owner).get('/owner/leads?limit=50').expect(200);
    assert.ok(ownerSees.body.data.items[0].withdrawnAt, 'the owner can tell it was withdrawn');

    // ---- 3. Listing reports
    await request(app).post(`/api/v1/businesses/${clinic._id}/report`).send({ reason: 'closed' }).expect(401);
    await as(customer).post(`/businesses/${clinic._id}/report`, { reason: 'made-up' }).expect(400);
    await as(owner).post(`/businesses/${clinic._id}/report`, { reason: 'spam' }).expect(409);
    await as(customer).post(`/businesses/${clinic._id}/report`, { reason: 'closed', note: 'Shop has been shut for months' }).expect(201);
    await as(customer).post(`/businesses/${clinic._id}/report`, { reason: 'spam' }).expect(409);
    await as(other).post(`/businesses/${clinic._id}/report`, { reason: 'duplicate' }).expect(201);
    await as(customer).get('/admin/listing-reports').expect(403);
    const list = await as(admin).get('/admin/listing-reports').expect(200);
    assert.equal(list.body.data.items.length, 2);
    assert.equal(list.body.data.items[0].openOnListing, 2);
    assert.equal(list.body.data.items[0].business.name, 'City Care Clinic');
    const stats = await as(admin).get('/admin/stats').expect(200);
    assert.equal(stats.body.data.openReports, 2);
    const [first, second] = list.body.data.items;
    await as(admin).patch(`/admin/listing-reports/${first._id}`, { action: 'dismiss', note: 'Looks open' }).expect(200);
    await as(admin).patch(`/admin/listing-reports/${first._id}`, { action: 'dismiss' }).expect(409);
    assert.equal(await publicStatus(), 200, 'dismissing keeps it live');
    await as(admin).patch(`/admin/listing-reports/${second._id}`, { action: 'suspend', note: 'Confirmed duplicate' }).expect(200);
    assert.equal((await Business.findById(clinic._id)).listingStatus, 'suspended');
    assert.equal(await publicStatus(), 404);
    const open = await as(admin).get('/admin/listing-reports?status=open').expect(200);
    assert.equal(open.body.data.items.length, 0);
  } finally { await disconnectDatabase(); await mongo.stop(); }
});
