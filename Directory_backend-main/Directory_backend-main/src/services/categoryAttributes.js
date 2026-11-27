// "Category details": the extra questions a category asks (a school's board and classes, a doctor's fee, a restaurant's cuisines).
// The questions live on the category (and its subcategories); a listing stores only the answers.
import { Category } from '../models/Category.js';

const clip = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/**
 * Checks the answers sent with a listing against the questions of its category and subcategories.
 * Unknown questions and options that are not offered are dropped, the label comes from the category (never from the sender),
 * and an empty answer is left out.
 */
export async function cleanAttributes(answers, categoryId, subcategoryIds = []) {
  if (!Array.isArray(answers) || !answers.length) return [];
  const ids = [categoryId, ...(subcategoryIds || [])].filter(Boolean).map((id) => String(id?._id || id));
  const categories = ids.length ? await Category.find({ _id: { $in: ids } }).select('fields').lean() : [];
  const questions = new Map();
  for (const category of categories) for (const field of category.fields || []) questions.set(field.key, field);

  const result = [];
  const seen = new Set();
  for (const answer of answers) {
    const field = questions.get(answer?.key);
    if (!field || seen.has(field.key)) continue;
    let values = (Array.isArray(answer.values) ? answer.values : []).map((value) => clip(value, 120)).filter(Boolean);
    if (field.type === 'select' || field.type === 'multi') values = values.filter((value) => field.options.includes(value));
    if (field.type === 'number') values = values.filter((value) => /^\d{1,9}$/.test(value));
    values = [...new Set(values)].slice(0, field.type === 'multi' ? 30 : 1);
    if (!values.length) continue;
    seen.add(field.key);
    result.push({ key: field.key, label: field.label, ...(field.unit ? { unit: field.unit } : {}), values });
  }
  return result;
}
