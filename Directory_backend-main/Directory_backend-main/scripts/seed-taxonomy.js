// Adds the categories, subcategories, services and "Category details" questions from data/taxonomy.js.
// Safe to run again: nothing is deleted or renamed, existing categories are matched by name or address (slug), only missing
// services are appended, and a category's questions are refreshed from the file.
//
//   node scripts/seed-taxonomy.js            shows what would change (changes nothing)
//   node scripts/seed-taxonomy.js --apply    applies it to the LOCAL database
//   add --allow-remote only when you really mean the live database
import dotenv from 'dotenv';
import { writeFileSync } from 'node:fs';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { Category } from '../src/models/Category.js';
import { TAXONOMY } from './data/taxonomy.js';
import { MORE } from './data/taxonomy-more.js';

// "Name: service|service" lines from taxonomy-more.js, as subcategories.
const moreFor = (slug) => (MORE[slug] || '').split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
  const [name, services = ''] = line.split(':').map((part) => part.trim());
  return { name, services: services.split('|').filter(Boolean), fields: [] };
});

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

const slugify = (value) => value.toLowerCase().replace(/&/g, ' and ').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const apply = process.argv.includes('--apply');
const uri = process.env.MONGODB_URI || '';
const isLocal = /\/\/(?:[^@/]*@)?(?:127\.0\.0\.1|localhost)[:/]/.test(uri);
if (!uri) { console.error('MONGODB_URI is not set.'); process.exit(1); }
if (apply && !isLocal && !process.argv.includes('--allow-remote')) {
  console.error('This is not the local database. Add --allow-remote if you really mean to change it.');
  process.exit(1);
}

const totals = { created: 0, updated: 0, services: 0 };

async function save({ name, slug, icon, services, fields }, parent, order) {
  const parentId = parent?._id || null;
  const sameName = { name: new RegExp(`^${escapeRegex(name)}$`, 'i'), parentCategory: parentId };
  const existing = (slug ? await Category.findOne({ slug }) : null) || await Category.findOne(sameName);
  if (existing) {
    const have = new Set(existing.services.map((item) => item.toLowerCase()));
    const missing = services.filter((item) => !have.has(item.toLowerCase()));
    totals.updated += 1; totals.services += missing.length;
    if (apply) {
      existing.services.push(...missing);
      if (fields.length) existing.fields = fields;
      if (!existing.icon && icon) existing.icon = icon;
      await existing.save();
    }
    return existing;
  }
  let address = slug || slugify(name);
  if (await Category.exists({ slug: address })) address = `${parent.slug}-${address}`;
  totals.created += 1; totals.services += services.length;
  if (!apply) return { _id: new mongoose.Types.ObjectId(), slug: address };
  return Category.create({ name, slug: address, parentCategory: parentId, services, fields, displayOrder: order, ...(icon ? { icon } : {}) });
}

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, autoIndex: false, autoCreate: false });
  console.log(`Database: ${isLocal ? 'local' : 'REMOTE'} · ${apply ? 'applying' : 'preview only'}`);
  if (apply) {
    // A copy of the categories as they are now, in case something has to be put back.
    const before = await Category.find().lean();
    const file = fileURLToPath(new URL(`../categories-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, import.meta.url));
    writeFileSync(file, JSON.stringify(before, null, 2));
    console.log(`Backup of ${before.length} categories saved to ${file}`);
  }
  for (const [order, main] of TAXONOMY.entries()) {
    const root = await save(main, null, order);
    const listed = new Set(main.subcategories.map((child) => child.name.toLowerCase()));
    const children = [...main.subcategories, ...moreFor(main.slug).filter((child) => !listed.has(child.name.toLowerCase()))];
    for (const [index, child] of children.entries()) await save(child, root, index);
  }
  console.log(`${apply ? 'Done' : 'Would do'}: ${totals.created} new categories, ${totals.updated} existing ones checked, ${totals.services} services added.`);
} catch (error) {
  console.error('Failed:', error.message.replace(/mongodb(?:\+srv)?:\/\/[^\s]+/g, '[redacted URI]'));
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
