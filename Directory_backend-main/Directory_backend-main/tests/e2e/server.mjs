// An isolated copy of the API for browser tests: in-memory MongoDB, seeded accounts and listings, so clicking Delete / Suspend never touches real data.
//   node tests/e2e/server.mjs            (listens on 5100; pair it with:  NEXT_DIST_DIR=.next-e2e NEXT_PUBLIC_API_URL=http://localhost:5100/api/v1 npx next dev -p 3100)
// Writes the seed (ids, the admin's backup codes) to E2E_SEED_FILE so the test driver can use them.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDatabase } from '../../src/config/db.js';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { Category } from '../../src/models/Category.js';
import { Business } from '../../src/models/Business.js';
import { Lead } from '../../src/models/Lead.js';
import { ListingClaim } from '../../src/models/ListingClaim.js';
import { ReviewReport } from '../../src/models/ReviewReport.js';
import { newRecoveryCodes, newTotpSecret, sealSecret } from '../../src/utils/totp.js';

const PORT = Number(process.env.E2E_PORT || 5100);
const config = { NODE_ENV: 'development', PORT, CLIENT_URL: process.env.E2E_CLIENT_URL || 'http://localhost:3100', JWT_ACCESS_SECRET: 'e'.repeat(48), JWT_REFRESH_SECRET: 'f'.repeat(48), JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '7d', RATE_LIMIT_MAX: 100000 };

const mongo = await MongoMemoryServer.create();
await connectDatabase(mongo.getUri('e2e'));
const hash = await bcrypt.hash('Test@12345', 10);
const mk = (name, email, role, extra = {}) => User.create({ name, email, role, emailVerified: true, passwordHash: hash, ...extra });

const secret = newTotpSecret();
const { codes, hashes } = newRecoveryCodes();
const admin = await mk('E2E Admin', 'admin@e2e.test', 'admin', { totpEnabled: true, totpSecretEnc: sealSecret(config, secret), totpRecovery: hashes });
const owner = await mk('E2E Owner', 'owner@e2e.test', 'business_owner');
const owner2 = await mk('Other Owner', 'other@e2e.test', 'business_owner');
const platform = await mk('Platform', 'platform@e2e.test', 'business_owner', { platformManaged: true });
const customer = await mk('E2E Customer', 'customer@e2e.test', 'customer');
const victim = await mk('Spammy Reviewer', 'spam@e2e.test', 'customer');

const health = await Category.create({ name: 'Healthcare', slug: 'healthcare', icon: 'stethoscope' });
const dentists = await Category.create({ name: 'Dentists', slug: 'dentists', parentCategory: health._id, services: ['Dental check-up', 'Teeth cleaning', 'Root canal treatment'] });
const food = await Category.create({ name: 'Cafes & Restaurants', slug: 'cafes-restaurants' });
const cafes = await Category.create({ name: 'Cafes', slug: 'cafes', parentCategory: food._id, services: ['Coffee', 'Breakfast'] });

const base = (name, slug, ownerDoc, extra = {}) => ({ name, slug, owner: ownerDoc._id, category: health._id, subCategory: dentists._id, services: ['Dental check-up'], description: `${name} is a friendly local business with experienced staff and clean rooms.`, phone: '9876543210', email: `${slug}@e2e.test`, address: { addressLine1: '12 Main Road', city: 'Ghaziabad', state: 'Uttar Pradesh', postalCode: '201001', locality: 'Indirapuram' }, listingStatus: 'published', verificationStatus: 'verified', ...extra });
const ownersCafe = await Business.create(base('Smile Dental', 'smile-dental', owner, { whatsapp: '9876543210', amenities: ['Wheelchair accessible', 'Free parking', 'Air conditioned', 'Card payments', 'Waiting lounge'], reviews: [{ user: customer._id, reviewerName: 'E2E Customer', rating: 5, comment: 'Great dentist, very gentle.' }, { user: victim._id, reviewerName: 'Spammy Reviewer', rating: 1, comment: 'Buy cheap watches at spam.example' }] }));
const pending = await Business.create(base('Waiting Clinic', 'waiting-clinic', owner2, { listingStatus: 'pending_review', verificationStatus: 'pending' }));
const claimable = await Business.create(base('Team Added Salon', 'team-added-salon', platform, { category: food._id, subCategory: cafes._id, services: ['Coffee'] }));
const owned2 = await Business.create(base('Other Dental', 'other-dental', owner2));
const lead = await Lead.create({ business: ownersCafe._id, name: 'Jamie', phone: '9812345678', message: 'Do you take emergency appointments?' });
const spamReview = ownersCafe.reviews.find((r) => r.rating === 1);
await ReviewReport.create({ business: ownersCafe._id, reviewId: spamReview._id, reporter: owner._id, reason: 'spam', note: 'Advertising' });
await ListingClaim.create({ business: owned2._id, claimant: customer._id, relationship: 'owner', phone: '9811111111', message: 'I run this clinic and the owner left.', previousOwner: owner2._id });

const server = createApp(config, { logging: false, rateLimitMax: 100000 }).listen(PORT, () => {
  fs.writeFileSync(process.env.E2E_SEED_FILE || fileURLToPath(new URL('./browser/.seed.json', import.meta.url)), JSON.stringify({ port: PORT, secret, backupCodes: codes, ids: { admin: String(admin._id), owner: String(owner._id), owner2: String(owner2._id), customer: String(customer._id), victim: String(victim._id), smile: String(ownersCafe._id), pending: String(pending._id), claimable: String(claimable._id), owned2: String(owned2._id), lead: String(lead._id), spamReview: String(spamReview._id), health: String(health._id) } }, null, 2));
  console.log(`E2E API ready on :${PORT}`);
});
process.on('SIGTERM', () => { server.close(); mongo.stop().finally(() => process.exit(0)); });
