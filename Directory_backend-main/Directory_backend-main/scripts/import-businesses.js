// Imports businesses from a JSON export (for example the MySQL directory_* tables) into MongoDB.
//   node scripts/import-businesses.js <path-to-businesses.json> [--dry-run]
// Re-running is safe: a business is matched by its slug and updated instead of duplicated.
import fs from 'node:fs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { parseEnv } from '../src/config/env.js';
import { Business } from '../src/models/Business.js';
import { Category } from '../src/models/Category.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
const file = process.argv[2];
const dryRun = process.argv.includes('--dry-run');
if (!file) { console.error('Usage: node scripts/import-businesses.js <businesses.json> [--dry-run]'); process.exit(1); }

const slugify = value => String(value).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 170) || 'business';
const blank = value => value === null || value === undefined || String(value).trim() === '';
const text = value => (blank(value) ? undefined : String(value).trim());
const national = value => { // the app stores Indian mobile numbers as 10 digits
  const raw = text(value); if (!raw) return undefined;
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+91') && digits.length === 12) return digits.slice(2);
  return raw;
};
const hhmm = value => (blank(value) ? undefined : String(value).slice(0, 5));

function toDocument(item, categoryId) {
  const hours = (item.hours || []).map(h => {
    if (h.isClosed) return { day: h.day, isClosed: true };
    if (h.is24Hours) return { day: h.day, isClosed: false, is24Hours: true };
    const opens = hhmm(h.opens); const closes = hhmm(h.closes);
    return opens && closes ? { day: h.day, isClosed: false, opens, closes } : { day: h.day, isClosed: true };
  });
  const address = Object.fromEntries(Object.entries(item.address || {}).map(([k, v]) => [k, text(v)]).filter(([, v]) => v !== undefined));
  if (address.country) address.country = address.country.toUpperCase();
  const social = Object.fromEntries(Object.entries(item.social || {}).filter(([, url]) => !blank(url)));
  const doc = {
    name: item.name.trim().slice(0, 180), slug: item.slug, category: categoryId,
    description: text(item.description), services: (item.services || []).map(String), amenities: (item.amenities || []).map(String),
    highlights: (item.highlights || []).map(String), keywords: (item.keywords || []).map(String),
    phone: national(item.phone), alternatePhone: national(item.alternatePhone), whatsapp: national(item.whatsapp), email: text(item.email), website: text(item.website),
    address, workingHours: hours, logo: text(item.logo), images: item.images || [], socialLinks: social,
    establishedYear: item.establishedYear || undefined, teamSize: item.teamSize || undefined,
    priceRange: ['budget', 'moderate', 'expensive', 'luxury'].includes(item.priceRange) ? item.priceRange : undefined,
    timeZone: text(item.timeZone) || 'Asia/Kolkata', googlePlaceId: text(item.googlePlaceId), mapEmbedUrl: text(item.mapEmbedUrl),
    faqs: item.faqs || [], offers: (item.offers || []).map(o => ({ title: o.title, description: text(o.description), code: text(o.code) })),
    reviews: (item.reviews || []).map(r => ({ reviewerName: r.reviewerName, rating: r.rating, comment: text(r.comment), createdAt: new Date(r.createdAt) })),
    viewCount: item.viewCount || 0,
    // Imported listings go live immediately; verification keeps the state recorded in the source.
    listingStatus: item.listingStatus === 'suspended' ? 'suspended' : 'published', verificationStatus: ['verified', 'rejected'].includes(item.verificationStatus) ? item.verificationStatus : 'pending',
  };
  if (Number.isFinite(item.latitude) && Number.isFinite(item.longitude)) doc.location = { type: 'Point', coordinates: [item.longitude, item.latitude] };
  return doc;
}

const items = JSON.parse(fs.readFileSync(file, 'utf8'));
const config = parseEnv();
await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

const categoryCache = new Map();
async function categoryId(name) {
  if (categoryCache.has(name)) return categoryCache.get(name);
  let category = await Category.findOne({ name, parentCategory: null });
  if (!category && !dryRun) category = await Category.create({ name, slug: slugify(name), description: `Find trusted ${name.toLowerCase()} near you.`, isActive: true });
  categoryCache.set(name, category?._id);
  return category?._id;
}

const stats = { created: 0, updated: 0, skipped: 0, warnings: 0 };
for (const item of items) {
  const doc = toDocument(item, await categoryId(item.category));
  let existing = await Business.findOne({ slug: doc.slug });
  const business = existing || new Business();
  business.set(doc);
  // Drop any single bad value (for example a malformed phone number) instead of losing the whole business.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const error = business.validateSync();
    if (!error) break;
    const bad = Object.keys(error.errors).filter(path => !['name', 'slug', 'category'].includes(path));
    if (!bad.length) break;
    for (const path of bad) { console.warn(`  ! ${item.name.slice(0, 40)}: dropped invalid "${path}"`); business.set(path, undefined); stats.warnings += 1; }
  }
  const finalError = business.validateSync();
  if (finalError) { console.error(`  x skipped ${item.name}: ${finalError.message}`); stats.skipped += 1; continue; }
  if (!dryRun) await business.save();
  if (existing) stats.updated += 1; else stats.created += 1;
}
console.log(dryRun ? 'DRY RUN' : 'Imported', stats, 'total in source:', items.length);
if (!dryRun) console.log('Businesses in MongoDB now:', await Business.countDocuments({ deletedAt: null }));
await mongoose.disconnect();
