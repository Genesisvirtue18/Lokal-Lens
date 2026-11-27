// Adds common services to the categories, so owners can tap them in "Add your business" instead of typing.
// Nothing is removed or renamed: only missing names are appended. Categories that are not listed here are left alone.
//
//   node scripts/add-category-services.js            shows what would be added (changes nothing)
//   node scripts/add-category-services.js --apply    adds them to the LOCAL database
//   add --allow-remote only when you really mean the live database
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { Category } from '../src/models/Category.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

const SERVICES = {
  'cafes-restaurants': ['Dine-in', 'Home delivery', 'Table booking', 'Breakfast', 'Lunch', 'Dinner', 'Coffee', 'Tea', 'Snacks', 'Bakery items', 'Desserts', 'Party orders', 'Outdoor seating', 'Vegetarian food'],
  healthcare: ['General physician', 'Dental check-up', 'Root canal treatment', 'Teeth cleaning', 'Eye check-up', 'Physiotherapy', 'Skin treatment', 'Child care', 'Gynaecology', 'Blood tests', 'X-ray', 'Vaccination', 'Home visit', 'Online consultation'],
  'home-services': ['AC repair', 'AC installation', 'Plumbing', 'Electrician', 'Carpentry', 'House painting', 'Deep cleaning', 'Pest control', 'Refrigerator repair', 'Washing machine repair', 'RO water purifier service', 'CCTV installation', 'Packers and movers', 'Interior design'],
  'beauty-wellness': ['Haircut', 'Hair colouring', 'Hair spa', 'Facial', 'Waxing', 'Threading', 'Manicure', 'Pedicure', 'Bridal makeup', 'Party makeup', 'Massage', 'Keratin treatment', 'Mehendi', 'Home service'],
  education: ['School admission', 'Play school', 'Tuition classes', 'Coaching for competitive exams', 'Spoken English', 'Computer courses', 'Online classes', 'Dance classes', 'Music classes', 'Drawing classes', 'Career counselling', 'Transport facility', 'Hostel facility', 'Day care'],
  automotive: ['Car service', 'Bike service', 'Car washing', 'Denting and painting', 'Wheel alignment', 'Tyre replacement', 'Battery replacement', 'Engine repair', 'Car AC repair', 'Oil change', 'Car accessories', 'Roadside assistance', 'Pickup and drop', 'Insurance claim help'],
  shopping: ['Clothing', 'Footwear', 'Electronics', 'Mobile phones', 'Furniture', 'Jewellery', 'Grocery', 'Gifts', 'Stationery', 'Home delivery', 'Custom orders', 'Wholesale', 'Exchange offers', 'Gift wrapping'],
  'professional-services': ['CA services', 'Income tax filing', 'GST registration', 'Company registration', 'Legal advice', 'Notary', 'Property consulting', 'Insurance advisory', 'Loan assistance', 'Digital marketing', 'Website design', 'Photography', 'Event planning', 'Printing'],
};

const apply = process.argv.includes('--apply');
const uri = process.env.MONGODB_URI || '';
const isLocal = /\/\/(?:[^@/]*@)?(?:127\.0\.0\.1|localhost)[:/]/.test(uri);
if (!uri) { console.error('MONGODB_URI is not set.'); process.exit(1); }
if (apply && !isLocal && !process.argv.includes('--allow-remote')) {
  console.error('This is not the local database. Add --allow-remote if you really mean to change it.');
  process.exit(1);
}

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, autoIndex: false, autoCreate: false });
  console.log(`Database: ${isLocal ? 'local' : 'REMOTE'} · ${apply ? 'applying' : 'preview only'}`);
  for (const [slug, names] of Object.entries(SERVICES)) {
    const category = await Category.findOne({ slug });
    if (!category) { console.log(`- ${slug}: no such category, skipped`); continue; }
    const have = new Set(category.services.map((name) => name.toLowerCase()));
    const missing = names.filter((name) => !have.has(name.toLowerCase()));
    if (apply && missing.length) await Category.updateOne({ _id: category._id }, { $addToSet: { services: { $each: missing } } });
    console.log(`- ${category.name}: ${missing.length ? `${apply ? 'added' : 'would add'} ${missing.length}` : 'already complete'}`);
  }
} catch (error) {
  console.error('Failed:', error.message.replace(/mongodb(?:\+srv)?:\/\/[^\s]+/g, '[redacted URI]'));
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
