// Starts the directory from zero: removes every business and what hangs off them (inquiries, claims, reports, stats).
// Accounts (owners, customers, admins) and categories are kept. A backup of everything removed is written first, so it can be restored.
//   node scripts/clear-businesses.js            -> only counts, changes nothing
//   CONFIRM=1 node scripts/clear-businesses.js  -> backs up, then deletes
// For safety it refuses a database that is not on this computer, unless you also set ALLOW_REMOTE=1.
import dotenv from 'dotenv';
import fs from 'node:fs';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from '../src/config/env.js';
import { Business } from '../src/models/Business.js';
import { BusinessDailyStat } from '../src/models/BusinessDailyStat.js';
import { ClaimCode } from '../src/models/ClaimCode.js';
import { Lead } from '../src/models/Lead.js';
import { ListingClaim } from '../src/models/ListingClaim.js';
import { ListingReport } from '../src/models/ListingReport.js';
import { ReviewReport } from '../src/models/ReviewReport.js';
import { User } from '../src/models/User.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
const config = parseEnv();
const isLocal = /^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/i.test(config.MONGODB_URI);
if (!isLocal && process.env.ALLOW_REMOTE !== '1') { console.error('This database is not on your computer, so nothing was touched. (Set ALLOW_REMOTE=1 only if you really mean it.)'); process.exit(1); }

await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
const dbName = mongoose.connection.name;
const sets = [['businesses', Business], ['inquiries', Lead], ['listing claims', ListingClaim], ['claim codes', ClaimCode], ['review reports', ReviewReport], ['listing reports', ListingReport], ['daily stats', BusinessDailyStat]];
const counts = {};
for (const [name, Model] of sets) counts[name] = await Model.countDocuments({});
console.log(`Database: ${dbName} (${isLocal ? 'on this computer' : 'REMOTE'})`);
console.log('Found:', Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', '));

if (process.env.CONFIRM !== '1') { console.log('Dry run: nothing was changed. Run with CONFIRM=1 to back up and delete.'); await mongoose.disconnect(); process.exit(0); }

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dir = path.resolve(fileURLToPath(new URL('../backups', import.meta.url)));
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `businesses-${dbName}-${stamp}.json`);
const backup = {};
for (const [name, Model] of sets) backup[name] = await Model.find({}).lean();
fs.writeFileSync(file, JSON.stringify(backup));
console.log(`Backup written: ${file} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);

for (const [name, Model] of sets) { const res = await Model.deleteMany({}); console.log(`Deleted ${res.deletedCount} ${name}`); }
// People's saved lists pointed at the removed businesses.
const cleaned = await User.updateMany({ saved: { $exists: true, $ne: [] } }, { $set: { saved: [] } });
console.log(`Cleared saved lists of ${cleaned.modifiedCount} accounts`);
console.log('Done. Categories and accounts were kept.');
await mongoose.disconnect();
