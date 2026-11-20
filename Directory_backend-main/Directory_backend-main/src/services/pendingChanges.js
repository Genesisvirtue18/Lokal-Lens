// Edits to a listing that has already been approved do not go live by themselves: they wait on the listing as `pendingChanges` until an
// admin approves them. The public page keeps showing the approved details in the meantime.
import { Business } from '../models/Business.js';

// Listings that an admin has approved before (live, paused by the owner, or suspended). Drafts and listings still in review are
// edited directly, because nothing of them is public yet.
export const MODERATED_STATUSES = new Set(['published', 'paused', 'suspended']);
// Promotions go live straight away; they are managed from the Offers tab and are time-limited.
const DIRECT_FIELDS = new Set(['offers']);

export const FIELD_LABELS = {
  name: 'Business name', tagline: 'Tagline', description: 'Description', businessType: 'Business type', establishedYear: 'Established year',
  category: 'Category', subcategories: 'Category', secondaryCategories: 'Category', address: 'Address', location: 'Map pin', locationApproximate: 'Map pin',
  phone: 'Phone', alternatePhone: 'Alternate phone', whatsapp: 'WhatsApp', email: 'Email', website: 'Website', socialLinks: 'Social links',
  services: 'Services', serviceItems: 'Services', workingHours: 'Opening hours', specialHours: 'Special days', images: 'Photos', logo: 'Logo',
  paymentModes: 'Payments', languages: 'Languages', priceRange: 'Price level', amenities: 'Facilities', homeDelivery: 'Home delivery',
  faqs: 'Questions', serviceMode: 'Who you serve', serviceAreas: 'Service areas', highlights: 'Highlights', keywords: 'Keywords', googlePlaceId: 'Google Place',
};
export const labelFor = (key) => FIELD_LABELS[key] || key;
export const labelsOf = (keys) => [...new Set(keys.map(labelFor))];

// Same value whatever the key order and whatever empty values (undefined, null, '') the schema adds or drops.
const plain = (value) => JSON.parse(JSON.stringify(value ?? null));
const sorted = (value) => {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).filter((key) => value[key] !== undefined && value[key] !== null && value[key] !== '').sort().map((key) => [key, sorted(value[key])]));
  return value;
};
const same = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));

/**
 * Applies an owner's update to a listing.
 * - Listings nobody has approved yet: applied directly.
 * - Approved listings: only offers are applied; everything else is stored as pending changes (a value set back to what is live
 *   cancels that pending change). Returns what happened so the caller can tell the owner.
 */
export function applyOwnerUpdate(item, body) {
  if (!MODERATED_STATUSES.has(item.listingStatus)) { Object.assign(item, body); return { held: false, fields: [], newlyHeld: false }; }
  const direct = {}; const held = {};
  for (const [key, value] of Object.entries(body)) (DIRECT_FIELDS.has(key) ? direct : held)[key] = value;
  Object.assign(item, direct);
  const live = plain(item.toObject());
  const probe = new Business(item.toObject());
  probe.set(held);
  const wanted = plain(probe.toObject());
  const before = { ...(item.pendingChanges?.data || {}) };
  const pending = { ...before };
  for (const key of Object.keys(held)) { if (same(live[key], wanted[key])) delete pending[key]; else pending[key] = held[key]; }
  const fields = Object.keys(pending);
  const unchanged = same(before, pending) && item.pendingChanges?.status === 'pending';
  if (!fields.length) { item.set('pendingChanges', undefined); return { held: false, fields: [], newlyHeld: false }; }
  if (!unchanged) item.set('pendingChanges', { data: pending, fields, submittedAt: new Date(), status: 'pending' });
  return { held: true, fields, newlyHeld: !unchanged };
}
