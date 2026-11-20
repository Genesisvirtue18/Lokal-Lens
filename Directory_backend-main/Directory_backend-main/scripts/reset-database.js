// Empties the whole LOCAL database (accounts, businesses, inquiries, reviews, sessions ... everything) except the category list,
// so you can test from zero. A full backup is written to backups/ first. Afterwards create an admin again (scripts/create-admin.js).
//   node scripts/reset-database.js            -> only counts, changes nothing
//   CONFIRM=1 node scripts/reset-database.js  -> backs up, then empties
// Refuses a database that is not on this computer.
import dotenv from 'dotenv';
import fs from 'node:fs';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from '../src/config/env.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
const config = parseEnv();
if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/i.test(config.MONGODB_URI)) { console.error('This database is not on your computer, so nothing was touched.'); process.exit(1); }
const KEEP = new Set(['categories']);
await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
const db = mongoose.connection.db;
const names = (await db.listCollections().toArray()).map((c) => c.name).filter((n) => !n.startsWith('system.'));
const counts = {};
for (const n of names) counts[n] = await db.collection(n).countDocuments({});
console.log(`Database: ${mongoose.connection.name} (on this computer)`);
console.log('Found:', names.map((n) => `${counts[n]} ${n}${KEEP.has(n) ? ' (kept)' : ''}`).join(', '));
if (process.env.CONFIRM !== '1') { console.log('Dry run: nothing was changed. Run with CONFIRM=1 to back up and empty.'); await mongoose.disconnect(); process.exit(0); }
const dir = path.resolve(fileURLToPath(new URL('../backups', import.meta.url)));
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `full-${mongoose.connection.name}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
const backup = {};
for (const n of names) backup[n] = await db.collection(n).find({}).toArray();
fs.writeFileSync(file, JSON.stringify(backup));
console.log('Backup written:', file);
for (const n of names) if (!KEEP.has(n)) await db.collection(n).deleteMany({});
console.log('Emptied everything except:', [...KEEP].join(', '));
await mongoose.disconnect();
