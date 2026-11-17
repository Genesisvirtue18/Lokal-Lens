// Adds map coordinates to published businesses that have none, using OpenStreetMap Nominatim (1 request/second).
// Street-level matches are stored as exact; when only the area can be found the pin is stored with locationApproximate=true.
//   node scripts/geocode-businesses.js [--limit=50]
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { parseEnv } from '../src/config/env.js';
import { Business } from '../src/models/Business.js';
import { geocodeAddress } from '../src/services/geocodingService.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 0;
await mongoose.connect(parseEnv().MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

const filter = { deletedAt: null, listingStatus: 'published', $or: [{ location: { $exists: false } }, { location: null }, { 'location.coordinates.0': { $exists: false } }] };
const businesses = await Business.find(filter).select('name address').limit(limit || 0);
console.log(`${businesses.length} businesses need coordinates`);
let exact = 0; let approximate = 0; let failed = 0;
for (const business of businesses) {
  const a = business.address || {};
  const parts = { addressLine1: a.addressLine1, addressLine2: a.addressLine2, landmark: a.landmark, locality: a.locality, city: a.city, state: a.state, postalCode: a.postalCode, country: a.country || 'IN' };
  try {
    let point = await geocodeAddress(parts);
    let isApproximate = false;
    if (!point) { point = await geocodeAddress({ locality: a.locality, city: a.city, state: a.state, country: a.country || 'IN' }); isApproximate = true; }
    if (!point && a.city) { point = await geocodeAddress({ city: a.city, state: a.state, country: a.country || 'IN' }); isApproximate = true; }
    if (!point) { failed++; console.log('no match:', business.name); continue; }
    await Business.updateOne({ _id: business._id }, { $set: { location: { type: 'Point', coordinates: [point.lng, point.lat] }, locationApproximate: isApproximate } });
    if (isApproximate) approximate++; else exact++;
  } catch (error) { failed++; console.log('error:', business.name, error.message); }
}
console.log(`done: exact=${exact} approximate=${approximate} failed=${failed}`);
await mongoose.disconnect();
