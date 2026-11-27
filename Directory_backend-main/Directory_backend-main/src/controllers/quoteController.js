// "Get quotes": a customer writes one request and chooses up to five businesses that receive it. Each of them gets it as an
// ordinary inquiry (marked as a quote request). Nobody receives a customer's details unless the customer picked them.
import mongoose from 'mongoose';
import { Business } from '../models/Business.js';
import { Category } from '../models/Category.js';
import { Lead } from '../models/Lead.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';

export const QUOTE_LIMIT = 5;
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findCategory = async (idOrSlug) => Category.findOne({ ...(mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug }), isActive: true }).select('name slug').lean();

/**
 * Published businesses in the city and category that can actually receive an inquiry: they need an active owner account,
 * otherwise the request would reach nobody. The customer's own businesses are left out.
 */
async function eligible({ categoryId, city, service, requesterId }) {
  const businesses = await Business.find({
    listingStatus: 'published', deletedAt: null, owner: { $ne: null },
    'address.city': new RegExp(`^\\s*${escapeRegex(city.trim())}\\s*$`, 'i'),
    $or: [{ category: categoryId }, { subcategories: categoryId }, { secondaryCategories: categoryId }],
  })
    .select('name slug services address.locality address.city verificationStatus isFeatured averageRating reviewCount owner category')
    .populate('owner', 'email name role status deletedAt notificationPreferences')
    .populate('category', 'name slug')
    .limit(300).lean();
  const wanted = String(service || '').trim().toLowerCase();
  const offers = (business) => (wanted && (business.services || []).some((item) => item.toLowerCase() === wanted) ? 1 : 0);
  return businesses
    .filter(({ owner }) => owner && owner.status === 'active' && !owner.deletedAt && owner.role === 'business_owner' && String(owner._id) !== String(requesterId || ''))
    .sort((a, b) => offers(b) - offers(a)
      || Number(b.verificationStatus === 'verified') - Number(a.verificationStatus === 'verified')
      || Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured))
      || (b.averageRating || 0) - (a.averageRating || 0)
      || a.name.localeCompare(b.name))
    .map((business) => ({ ...business, offersService: Boolean(offers(business)) }));
}

// What the customer sees before sending: who could receive the request. No owner details are ever included.
export const quoteMatches = () => async (req, res, next) => { try {
  const { category, city, service } = req.validated.query;
  const found = await findCategory(category);
  if (!found) throw new AppError('Choose a category', 422);
  const matches = await eligible({ categoryId: found._id, city, service, requesterId: req.user?.id });
  sendSuccess(res, 'Matching businesses', {
    limit: QUOTE_LIMIT,
    total: matches.length,
    items: matches.slice(0, 10).map((business) => ({
      _id: String(business._id), name: business.name, slug: business.slug, locality: business.address?.locality, city: business.address?.city,
      category: business.category ? { name: business.category.name, slug: business.category.slug } : undefined,
      verified: business.verificationStatus === 'verified', offersService: business.offersService,
      averageRating: business.averageRating, reviewCount: business.reviewCount,
    })),
  });
} catch (error) { next(error); } };

export const createQuote = (config, mailer) => async (req, res, next) => { try {
  const { category, city, service, name, phone, email, message, businessIds } = req.validated.body;
  const found = await findCategory(category);
  if (!found) throw new AppError('Choose a category', 422);
  const wanted = [...new Set(businessIds)];
  const matches = await eligible({ categoryId: found._id, city, service, requesterId: req.user?.id });
  const chosen = matches.filter((business) => wanted.includes(String(business._id)));
  if (chosen.length !== wanted.length) throw new AppError('One of the chosen businesses can no longer receive requests. Refresh the list and choose again.', 422);

  const quoteId = new mongoose.Types.ObjectId();
  const sentTo = [];
  for (const business of chosen) {
    // The same request sent twice within ten minutes (double click, reload) reaches each business only once.
    const repeat = await Lead.exists({ business: business._id, phone, message, createdAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) } });
    sentTo.push({ _id: String(business._id), name: business.name });
    if (repeat) continue;
    await Lead.create({ business: business._id, ...(req.user?.id ? { user: req.user.id } : {}), name, phone, ...(email ? { email } : {}), ...(service ? { service } : {}), message, source: 'quote', quoteId });
    const { owner } = business;
    if (mailer && owner.email && owner.notificationPreferences?.email !== false) {
      const lines = [`${name} asked for a quote (${found.name}, ${city}). It was sent to ${chosen.length} business${chosen.length === 1 ? '' : 'es'}.`, '', `Phone: ${phone}`, ...(email ? [`Email: ${email}`] : []), ...(service ? [`Service: ${service}`] : []), '', message, '', `Open your dashboard to reply: ${config?.CLIENT_URL || ''}/business-owner`];
      mailer.send({ to: owner.email, subject: `New quote request for ${business.name}`, text: lines.join('\n') }).catch(() => console.error('Quote email could not be sent'));
    }
  }
  const customerTo = email || req.user?.email;
  if (mailer && customerTo) {
    mailer.send({ to: customerTo, subject: 'Your quote request was sent', text: [`Hi ${name},`, '', 'Your request was sent to:', ...sentTo.map((item) => `- ${item.name}`), '', `They can contact you on ${phone}.`, '', message].join('\n') }).catch(() => console.error('Quote confirmation email could not be sent'));
  }
  sendSuccess(res, `Your request was sent to ${sentTo.length} business${sentTo.length === 1 ? '' : 'es'}`, { sentTo }, 201);
} catch (error) { next(error); } };
