// Creates (or promotes) the first admin for a live site. Run it once, on your own machine or in the Render shell:
//   ADMIN_EMAIL=you@example.com ADMIN_NAME="Your Name" ADMIN_PASSWORD='a-long-password' node scripts/create-admin.js
// The password is read from the environment so it never appears in shell history or in the code.
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { parseEnv } from '../src/config/env.js';
import { User } from '../src/models/User.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const name = String(process.env.ADMIN_NAME || 'Administrator').trim();
const password = String(process.env.ADMIN_PASSWORD || '');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { console.error('Set ADMIN_EMAIL to a valid email address.'); process.exit(1); }
if (password.length < 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) { console.error('ADMIN_PASSWORD must be at least 12 characters and include letters and numbers.'); process.exit(1); }

await mongoose.connect(parseEnv().MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
const passwordHash = await bcrypt.hash(password, 12);
const user = await User.findOneAndUpdate({ email }, { $set: { name, email, role: 'super_admin', passwordHash, status: 'active', emailVerified: true } }, { upsert: true, new: true, setDefaultsOnInsert: true });
console.log(`Admin ready: ${user.email} (${user.role}). Sign in at /login with the password you set.`);
await mongoose.disconnect();
