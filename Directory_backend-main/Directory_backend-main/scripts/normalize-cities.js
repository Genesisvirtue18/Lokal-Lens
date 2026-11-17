// Normalises address.city / locality / state of every business in MongoDB (see scripts/lib/normalize-address.js).
//   node scripts/normalize-cities.js [--dry-run]
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { parseEnv } from '../src/config/env.js';
import { Business } from '../src/models/Business.js';
import { normalizeAddress } from './lib/normalize-address.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
const dryRun = process.argv.includes('--dry-run');
await mongoose.connect(parseEnv().MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

const changes = new Map();
let updated = 0;
for (const business of await Business.find({ deletedAt: null })) {
  const before = business.address?.toObject?.() || business.address || {};
  const next = normalizeAddress({ city: before.city, state: before.state, locality: before.locality, country: before.country });
  const keys = ['city', 'state', 'locality'].filter(key => (before[key] || undefined) !== next[key]);
  if (!keys.length) continue;
  const label = `${before.city ?? '-'} -> ${next.city ?? '-'}`;
  changes.set(label, (changes.get(label) || 0) + 1);
  if (!dryRun) {
    for (const key of keys) business.set(`address.${key}`, next[key]);
    await business.save({ validateModifiedOnly: true });
  }
  updated += 1;
}
console.log(dryRun ? 'DRY RUN' : 'Updated', updated, 'businesses');
for (const [label, count] of [...changes].sort((a, b) => b[1] - a[1])) console.log(`  ${String(count).padStart(3)}  ${label}`);
if (!dryRun) {
  const rows = await Business.aggregate([{ $match: { listingStatus: 'published', deletedAt: null } }, { $group: { _id: '$address.city', n: { $sum: 1 } } }, { $sort: { n: -1 } }]);
  console.log('Cities now:', rows.map(row => `${row._id || '-'}(${row.n})`).join(', '));
}
await mongoose.disconnect();
