// Creates a business-owner account (signs in with an email code, no password needed) and gives it every listing that has no owner yet.
//   OWNER_EMAIL=gmb@genesisvirtue.com OWNER_NAME="Genesis Virtue" node scripts/assign-listings-to-owner.js
// Add DRY_RUN=1 to only count. It is safe to run twice: listings that already have an owner are never touched.
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { parseEnv } from '../src/config/env.js';
import { Business } from '../src/models/Business.js';
import { User } from '../src/models/User.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
const email = String(process.env.OWNER_EMAIL || '').trim().toLowerCase();
const name = String(process.env.OWNER_NAME || 'Business owner').trim();
const dryRun = process.env.DRY_RUN === '1';
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { console.error('Set OWNER_EMAIL to a valid email address.'); process.exit(1); }

await mongoose.connect(parseEnv().MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
const unowned = { deletedAt: null, $or: [{ owner: null }, { owner: { $exists: false } }] };
const waiting = await Business.countDocuments(unowned);
console.log(`Listings without an owner: ${waiting}`);

let user = await User.findOne({ email });
if (user && user.role !== 'business_owner') { console.error(`${email} already exists as "${user.role}". Use a different email, or change that account first.`); process.exit(1); }
if (dryRun) { console.log(user ? `Account exists (${user.email}).` : `Would create the owner account ${email}.`); console.log('Dry run: nothing was changed.'); await mongoose.disconnect(); process.exit(0); }

if (!user) user = await User.create({ name, email, role: 'business_owner', status: 'active', emailVerified: false });
const result = await Business.updateMany(unowned, { $set: { owner: user._id } });
const total = await Business.countDocuments({ owner: user._id, deletedAt: null });
console.log(`Owner account: ${user.email} (${user.role}, ${user.status})`);
console.log(`Listings assigned now: ${result.modifiedCount}. This account owns ${total} listings in total.`);
await mongoose.disconnect();
