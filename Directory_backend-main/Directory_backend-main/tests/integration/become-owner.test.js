import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDatabase, disconnectDatabase } from '../../src/config/db.js';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';

const config = { NODE_ENV: 'test', CLIENT_URL: 'http://localhost:5173', JWT_ACCESS_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'b'.repeat(40), JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '7d' };

test('a customer can switch their own account to a business account; nobody else is affected', { timeout: 120000 }, async () => {
  const mongo = await MongoMemoryServer.create();
  try {
    await connectDatabase(mongo.getUri('become_owner'));
    const app = createApp(config, { logging: false, rateLimitMax: 1000 });
    const tokenFor = (user) => jwt.sign({ sub: String(user._id) }, config.JWT_ACCESS_SECRET, { expiresIn: '10m' });
    const post = (user) => request(app).post('/api/v1/users/me/become-owner').set(user ? { Authorization: `Bearer ${tokenFor(user)}` } : {});

    await post(null).expect(401);                                            // signed out
    const noPhone = await User.create({ name: 'No Phone', email: 'np@example.com', role: 'customer', emailVerified: true });
    const refused = await post(noPhone).expect(400);                         // needs a mobile number first
    assert.match(refused.body.message, /mobile number/i);
    assert.equal((await User.findById(noPhone._id)).role, 'customer');

    const customer = await User.create({ name: 'Real Customer', email: 'c@example.com', phone: '9876500011', role: 'customer', emailVerified: true });
    const done = await post(customer).expect(200);
    assert.equal(done.body.data.user.role, 'business_owner');
    assert.equal((await User.findById(customer._id)).role, 'business_owner');
    await post(customer).expect(200);                                        // pressing it twice is harmless
    assert.equal((await User.findById(customer._id)).role, 'business_owner');
    await request(app).get('/api/v1/owner/businesses').set({ Authorization: `Bearer ${tokenFor(customer)}` }).expect(200);   // owner area now opens

    const admin = await User.create({ name: 'Admin', email: 'a@example.com', phone: '9876500012', role: 'admin', emailVerified: true });
    await post(admin).expect(403);                                           // admins are never changed
    assert.equal((await User.findById(admin._id)).role, 'admin');
  } finally { await disconnectDatabase(); await mongo.stop(); }
});
