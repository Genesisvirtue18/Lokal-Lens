// Shows (and, if you ask, restores) one account. Prints no passwords or secrets.
//   EMAIL=you@example.com node scripts/account-status.js              -> shows role and status
//   EMAIL=you@example.com RESTORE=1 node scripts/account-status.js    -> makes a removed/suspended account active again
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { parseEnv } from '../src/config/env.js';
import { User } from '../src/models/User.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
const email = String(process.env.EMAIL || '').trim().toLowerCase();
if (!email) { console.error('Set EMAIL=you@example.com'); process.exit(1); }
await mongoose.connect(parseEnv().MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
const user = await User.findOne({ email });
if (!user) console.log('No account with that email.');
else {
  console.log(`Account: ${user.email} | name: ${user.name} | role: ${user.role} | status: ${user.status} | email confirmed: ${user.emailVerified} | has password: ${Boolean(await User.exists({ _id: user._id, passwordHash: { $exists: true } }))}`);
  if (process.env.RESTORE === '1' && user.status !== 'active') {
    user.status = 'active'; user.deletedAt = null; await user.save();
    console.log('Restored: the account is active again.');
  }
}
await mongoose.disconnect();
