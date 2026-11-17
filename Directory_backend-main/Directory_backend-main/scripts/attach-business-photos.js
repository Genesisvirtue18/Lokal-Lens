// Downloads business photos and attaches them to the matching MongoDB business (matched by slug).
//   node scripts/attach-business-photos.js <photos.json> [--dry-run] [--max=5]
// photos.json: [{ "slug": "kutumb-dental", "urls": ["https://...", ...] }, ...]
//
// Hosting: if CLOUDINARY_* is set in .env the photos are uploaded to Cloudinary (recommended, works on any server).
// Otherwise they are saved in ./uploads/businesses and served by this API (local development only).
// Safe to re-run: imported files get fixed names, photos you uploaded yourself are kept, and nothing is duplicated.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { fileTypeFromBuffer } from 'file-type';
import { parseEnv } from '../src/config/env.js';
import { cloudinary, configureCloudinary } from '../src/config/cloudinary.js';
import { Business } from '../src/models/Business.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
const file = process.argv.find((arg, index) => index > 1 && !arg.startsWith('--'));
const dryRun = process.argv.includes('--dry-run');
const maxPerBusiness = Number((process.argv.find(arg => arg.startsWith('--max=')) || '--max=5').split('=')[1]);
if (!file) { console.error('Usage: node scripts/attach-business-photos.js <photos.json> [--dry-run] [--max=5]'); process.exit(1); }

const config = parseEnv();
const useCloudinary = Boolean(config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET);
if (useCloudinary) configureCloudinary(config);
const publicBase = (process.env.PUBLIC_API_URL || `http://localhost:${config.PORT}`).replace(/\/$/, '');
const localDir = fileURLToPath(new URL('../uploads/businesses/', import.meta.url));
const IMPORT_MARKERS = ['/business-directory/imports/', '/uploads/businesses/'];
const isImported = url => IMPORT_MARKERS.some(marker => String(url).includes(marker));
const ALLOWED = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LokalLensImporter/1.0)' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > 10 * 1024 * 1024) throw new Error('larger than 10 MB');
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !ALLOWED[detected.mime]) throw new Error('not a JPEG, PNG or WebP image');
  return { buffer, extension: ALLOWED[detected.mime] };
}

async function host(slug, index, image) {
  const name = `${slug}-${index + 1}`;
  if (useCloudinary) {
    return new Promise((resolve, reject) => cloudinary.uploader.upload_stream(
      { folder: 'business-directory/imports', public_id: name, overwrite: true, resource_type: 'image' },
      (error, result) => (error || !result?.secure_url ? reject(error || new Error('Cloudinary did not return a URL')) : resolve(result.secure_url)),
    ).end(image.buffer));
  }
  fs.mkdirSync(localDir, { recursive: true });
  const filename = `${name}.${image.extension}`;
  fs.writeFileSync(path.join(localDir, filename), image.buffer);
  return `${publicBase}/uploads/businesses/${filename}`;
}

const entries = new Map();
for (const item of JSON.parse(fs.readFileSync(file, 'utf8'))) {
  const merged = entries.get(item.slug) || [];
  for (const url of item.urls || []) if (!merged.includes(url)) merged.push(url);
  entries.set(item.slug, merged);
}

await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
console.log(`${dryRun ? 'DRY RUN. ' : ''}Hosting: ${useCloudinary ? 'Cloudinary' : `local uploads folder (${publicBase})`}. Businesses in file: ${entries.size}`);
const stats = { updated: 0, noBusiness: 0, noPhotos: 0, photos: 0, failedPhotos: 0 };
for (const [slug, urls] of entries) {
  const business = await Business.findOne({ slug });
  if (!business) { console.warn(`  - no business with slug "${slug}"`); stats.noBusiness += 1; continue; }
  if (!urls.length) { stats.noPhotos += 1; continue; }
  const hosted = [];
  for (const url of urls.slice(0, maxPerBusiness)) {
    try {
      if (dryRun) { hosted.push(url); continue; }
      hosted.push(await host(slug, hosted.length, await download(url)));
    } catch (error) {
      stats.failedPhotos += 1;
      console.warn(`  ! ${slug}: ${url.slice(0, 60)}… ${error.message}`);
    }
  }
  if (!hosted.length) continue;
  // Photos added by the owner stay first; imported ones follow and replace the previous import.
  const own = (business.images || []).filter(image => !isImported(image));
  business.images = [...own, ...hosted];
  if (!dryRun) await business.save();
  stats.updated += 1; stats.photos += hosted.length;
  console.log(`  ok ${slug}: ${hosted.length} photo${hosted.length === 1 ? '' : 's'}${own.length ? ` (+${own.length} existing kept)` : ''}`);
}
console.log(dryRun ? 'DRY RUN result:' : 'Done:', stats);
await mongoose.disconnect();
