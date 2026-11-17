// Creates (or resets) test accounts for local testing. Never run against production.
//   node scripts/seed-test-users.js
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { parseEnv } from '../src/config/env.js';
import { User } from '../src/models/User.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
const config = parseEnv();
if (config.NODE_ENV === 'production') { console.error('Refusing to create test users in production.'); process.exit(1); }
await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
const password = 'Test@12345';
const accounts = [
  { name: 'Test Owner', email: 'owner@lokallens.test', role: 'business_owner' },
  { name: 'Test Customer', email: 'customer@lokallens.test', role: 'customer' },
  { name: 'Test Admin', email: 'admin@lokallens.test', role: 'admin' },
];
for (const account of accounts) {
  const passwordHash = await bcrypt.hash(password, 12);
  await User.findOneAndUpdate({ email: account.email }, { $set: { ...account, passwordHash, status: 'active', emailVerified: true } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  console.log(`${account.role.padEnd(15)} ${account.email}  /  ${password}`);
}
await mongoose.disconnect();
