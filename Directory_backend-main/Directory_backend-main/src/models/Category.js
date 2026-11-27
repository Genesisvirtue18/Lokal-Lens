import mongoose from 'mongoose';
import { slugField, urlField } from './fields.js';

// One extra question a listing in this category can answer, e.g. { key: 'board', label: 'Board', type: 'multi', options: [...] }.
const fieldSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true, match: /^[a-z][a-z0-9_]{0,59}$/ },
  label: { type: String, required: true, trim: true, maxlength: 80 },
  type: { type: String, required: true, enum: ['select', 'multi', 'text', 'number'] },
  options: [{ type: String, trim: true, maxlength: 120 }],
  placeholder: { type: String, trim: true, maxlength: 120 },
  unit: { type: String, trim: true, maxlength: 20 },
}, { _id: false });

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  slug: slugField,
  description: { type: String, trim: true, maxlength: 2000 },
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  icon: { type: String, trim: true, maxlength: 300 },
  image: urlField,
  keywords: [{ type: String, trim: true, maxlength: 80 }],
  // Services live on a subcategory so the owner form can offer the correct
  // choices after a category and subcategory have been selected.
  services: [{ type: String, trim: true, maxlength: 150 }],
  fields: [fieldSchema],
  businessCount: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0, min: 0, validate: Number.isInteger },
}, { timestamps: true });
categorySchema.index({ parentCategory: 1 });
categorySchema.index({ name: 'text', keywords: 'text', description: 'text' });

export const Category = mongoose.model('Category', categorySchema);
