// Removes every account except the ones you list. Removed accounts are soft-deleted (status "deleted", sessions ended), not erased,
// so they can be restored from the database if needed. Without CONFIRM=1 it only lists what it would remove.
//   KEEP_EMAILS="a@x.com,b@y.com" node scripts/keep-only-accounts.js
//   KEEP_EMAILS="a@x.com,b@y.com" CONFIRM=1 node scripts/keep-only-accounts.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { parseEnv } from '../src/config/env.js';
import { Business } from '../src/models/Business.js';
import { RefreshToken } from '../src/models/RefreshToken.js';
import { User } from '../src/models/User.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
const keep = String(process.env.KEEP_EMAILS || '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
if (!keep.length) { console.error('Set KEEP_EMAILS to the comma-separated emails you want to keep.'); process.exit(1); }

await mongoose.connect(parseEnv().MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
const kept = await User.find({ email: { $in: keep }, deletedAt: null }).select('email role').lean();
const missing = keep.filter((email) => !kept.some((user) => user.email === email));
if (missing.length) { console.error(`These accounts do not exist, so nothing was changed: ${missing.join(', ')}`); process.exit(1); }

const doomed = await User.find({ email: { $nin: keep }, deletedAt: null, status: { $ne: 'deleted' } }).select('name email role').lean();
const owning = await Business.aggregate([{ $match: { owner: { $in: doomed.map((user) => user._id) }, deletedAt: null } }, { $group: { _id: '$owner', count: { $sum: 1 } } }]);
if (owning.length) console.log(`Note: ${owning.reduce((sum, row) => sum + row.count, 0)} listings belong to accounts being removed; they will have no owner afterwards.`);
console.log(`Keeping ${kept.length}: ${kept.map((user) => `${user.email} (${user.role})`).join(', ')}`);
console.log(`Removing ${doomed.length}:`); doomed.forEach((user) => console.log(`  - ${user.name} <${user.email || 'no email'}> (${user.role})`));

if (process.env.CONFIRM !== '1') { console.log('Dry run: nothing was changed. Add CONFIRM=1 to remove them.'); await mongoose.disconnect(); process.exit(0); }
const ids = doomed.map((user) => user._id);
await User.updateMany({ _id: { $in: ids } }, { $set: { status: 'deleted', deletedAt: new Date() } });
await RefreshToken.updateMany({ user: { $in: ids }, revokedAt: null }, { $set: { revokedAt: new Date() } });
await Business.updateMany({ owner: { $in: ids } }, { $unset: { owner: '' } });
console.log(`Removed ${doomed.length} accounts.`);
await mongoose.disconnect();
