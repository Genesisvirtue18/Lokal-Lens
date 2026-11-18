// Moves listing photos that point at http://localhost:5000/uploads/... to Cloudinary and rewrites the URLs in the database.
// Reads CLOUDINARY_* and MONGODB_URI from the file given as the first argument (default ../.env.atlas), so nothing secret is typed in a command.
//   node scripts/migrate-photos-to-cloudinary.js ../.env.atlas [--limit=5]
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { fileURLToPath } from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const envFile = path.resolve(process.cwd(), process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '../.env.atlas');
const env = dotenv.parse(fs.readFileSync(envFile));
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 0;
for (const key of ['MONGODB_URI', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) if (!env[key]) { console.error(`${key} is missing in ${path.basename(envFile)}`); process.exit(1); }
cloudinary.config({ cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET, secure: true });
const uploadsDir = here('../uploads');

await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
const col = mongoose.connection.db.collection('businesses');
const cache = new Map();
async function toCloud(url) {
  if (cache.has(url)) return cache.get(url);
  const match = String(url).match(/\/uploads\/(.+)$/);
  const file = match && path.join(uploadsDir, decodeURIComponent(match[1]));
  if (!file || !fs.existsSync(file)) { cache.set(url, null); return null; }
  const result = await cloudinary.uploader.upload(file, { folder: 'business-directory/listings', public_id: path.basename(file, path.extname(file)), overwrite: false, resource_type: 'image', quality: 'auto', fetch_format: 'auto' }).catch(async (error) => {
    if (/already exists/i.test(error?.message || '')) return { secure_url: cloudinary.url(`business-directory/listings/${path.basename(file, path.extname(file))}`, { secure: true }) };
    throw error;
  });
  cache.set(url, result.secure_url);
  return result.secure_url;
}

const docs = await col.find({ $or: [{ images: /localhost/ }, { logo: /localhost/ }] }).project({ name: 1, images: 1, logo: 1 }).limit(limit || 0).toArray();
console.log(`${docs.length} listings to move`);
let moved = 0; let missing = 0; let done = 0;
for (const doc of docs) {
  const images = [];
  for (const url of doc.images || []) {
    if (!/localhost/.test(url)) { images.push(url); continue; }
    try { const next = await toCloud(url); if (next) { images.push(next); moved++; } else missing++; } catch (error) { console.log('upload failed:', doc.name, String(error.message).slice(0, 80)); images.push(url); }
  }
  const logo = doc.logo && /localhost/.test(doc.logo) ? (await toCloud(doc.logo).catch(() => null)) || images[0] || undefined : doc.logo;
  await col.updateOne({ _id: doc._id }, { $set: { images, ...(logo ? { logo } : {}), photoCount: images.length } });
  if (++done % 10 === 0) console.log(`${done}/${docs.length} listings, ${moved} photos`);
}
console.log(`done: ${moved} photos moved, ${missing} files not found`);
await mongoose.disconnect();
