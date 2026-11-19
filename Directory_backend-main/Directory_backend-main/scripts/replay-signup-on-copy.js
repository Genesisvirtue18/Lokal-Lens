// Replays a sign-up against a COPY of your real local accounts (read-only on the real database), so a flow can be checked on messy,
// real data before you try it by hand. Nothing in the real database is changed.
//   EMAIL=you@example.com PHONE=9799776261 ROLE=business_owner node scripts/replay-signup-on-copy.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';
import { User } from '../src/models/User.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
const email = String(process.env.EMAIL || '').toLowerCase();
const phone = process.env.PHONE || '';
const role = process.env.ROLE || 'business_owner';
if (!email) { console.error('Set EMAIL=...'); process.exit(1); }

// 1) read the real accounts (no writes)
const real = parseEnv();
const source = await mongoose.createConnection(real.MONGODB_URI).asPromise();
const rows = await source.db.collection('users').find({}).toArray();
await source.close();
console.log(`Copied ${rows.length} real accounts into a throwaway database`);
const mine = rows.find((r) => r.email === email);
console.log('Your account right now:', mine ? `${mine.role}, status ${mine.status}, email confirmed ${Boolean(mine.emailVerified)}, phone ${mine.phone || 'none'}` : 'none');
const holder = phone && rows.filter((r) => r.phone === phone && r.email !== email).map((r) => `${r.email} (${r.status}, confirmed ${Boolean(r.emailVerified)})`);
if (holder?.length) console.log('Others holding that phone:', holder.join(', '));

// 2) throwaway database with those accounts, and an app with no mail server so the code is returned
const mongo = await MongoMemoryServer.create();
await mongoose.connect(mongo.getUri('replay'));
await User.collection.insertMany(rows.map(({ _id, ...rest }) => ({ _id, ...rest })));
const config = { NODE_ENV: 'development', CLIENT_URL: 'http://localhost:3000', JWT_ACCESS_SECRET: 'r'.repeat(40), JWT_REFRESH_SECRET: 'q'.repeat(40), JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '7d' };
const app = createApp(config, { logging: false, rateLimitMax: 100000 });
const api = (path, body) => request(app).post(`/api/v1${path}`).send(body);

// 3) the exact steps a person takes (twice, with a retry, like a real try)
const step = (label, res) => console.log(`${res.status < 400 ? 'OK  ' : 'FAIL'} ${label} -> ${res.status} ${res.body.message || ''}`);
const first = await api('/auth/otp/request', { email, name: 'Test Name', role, ...(phone ? { phone } : {}) });
step('ask for a code', first);
await User.updateOne({ email }, { $unset: { otpSentAt: 1 } });   // skip the 30-second wait
const second = await api('/auth/otp/request', { email, name: 'Test Name', role, ...(phone ? { phone } : {}) });
step('ask again (retry)', second);
const verified = await api('/auth/otp/verify', { email, code: second.body.data?.devCode || '000000' });
step('enter the code', verified);
const after = await User.findOne({ email });
console.log('Result:', after ? `${after.role}, status ${after.status}, email confirmed ${after.emailVerified}, phone ${after.phone || 'none'}` : 'no account');
console.log(verified.status === 200 && after.role === role ? 'PASS: this sign-up works on your real data.' : 'FAIL: something is wrong.');
await mongoose.disconnect(); await mongo.stop();
