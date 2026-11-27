import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { Location } from '../models/Location.js';
import { Business } from '../models/Business.js';
import { Lead } from '../models/Lead.js';
import { EVENT_FIELDS, bump } from '../models/BusinessDailyStat.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';
const pageResult = async (Model, filter, req, message, select, sort = { name: 1, _id: 1 }, populate, collation) => { const { page, limit } = req.validated.query; let find = Model.find(filter).select(select || '').sort(sort).skip((page - 1) * limit).limit(limit); let count = Model.countDocuments(filter); if (populate) find = find.populate(populate); if (collation) { find = find.collation(collation); count = count.collation(collation); } const [items, totalItems] = await Promise.all([find.lean(), count]); return { items, pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit), hasNextPage: page * limit < totalItems, hasPreviousPage: page > 1 } }; };
const standardizeReviewStats = item => {
  if (!item?.reviews?.length) return { ...item, averageRating: Number(item.averageRating || 0), reviewCount: Number(item.reviewCount || 0) };
  const ratings = item.reviews.map(review => Number(review.rating)).filter(rating => Number.isFinite(rating) && rating >= 1 && rating <= 5);
  return { ...item, reviews: item.reviews.map(review => ({ ...review, rating: Number(review.rating) })), averageRating: ratings.length ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(2)) : 0, reviewCount: ratings.length };
};
const publicListing = item => {
  const hasGooglePlaceId = typeof item?.hasGooglePlaceId === 'boolean'
    ? item.hasGooglePlaceId
    : Boolean(item?.googleBusinessProfileLocation) || Boolean(item?.googlePlaceId) && item?.googlePlaceVerificationStatus !== 'mismatch';
  const normalized = standardizeReviewStats(item);
  delete normalized.googlePlaceId;
  delete normalized.googlePlaceVerificationStatus;
  delete normalized.googleBusinessProfileLocation;
  delete normalized.googleBusinessProfileTitle;
  delete normalized.googleBusinessProfileLinkedAt;
  // KYC details are private. Only expose whether the GST number was verified by our team.
  const gstVerified = normalized.kycStatus === 'verified' && Boolean(normalized.gstNumber);
  delete normalized.gstNumber;
  delete normalized.msmeNumber;
  if (Array.isArray(normalized.reviews)) normalized.reviews = normalized.reviews.map(({ user, ...review }) => review);
  delete normalized.kycDocuments;
  // The listing email is for our team to reach the owner, not for the public (the form says so). Internal counters stay internal too.
  delete normalized.email;
  delete normalized.leadCount;
  delete normalized.contactClickCount;
  delete normalized.deletedAt;
  delete normalized.__v;
  delete normalized.kycStatus;
  delete normalized.plan;
  delete normalized.planExpiresAt;
  return { ...normalized, hasGooglePlaceId, gstVerified };
};
const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const STOP_WORDS = new Set(['in', 'near', 'me', 'nearby', 'best', 'top', 'the', 'a', 'an', 'of', 'for', 'and', 'at', 'around', 'to']);
// Break a search into meaningful words so "best dentist in noida" matches a dentist in Noida.
const searchTokens = text => {
  const words = String(text || '').toLowerCase().split(/[^a-z0-9ऀ-ॿ]+/).filter(Boolean);
  const meaningful = words.filter(word => !STOP_WORDS.has(word));
  // Light stemming so "dentist" finds "Dental/Dentistry" and "restaurants" finds "Restaurant".
  const stem = word => { const root = word.replace(/(ists?|ies|es|s)$/, ''); return root.length >= 3 ? root : word; };
  return [...new Set((meaningful.length ? meaningful : words).map(stem))].slice(0, 6);
};
const premiumActiveExpr = now => ({ $or: [
  { $and: [{ $eq: ['$plan', 'premium'] }, { $or: [{ $eq: [{ $ifNull: ['$planExpiresAt', null] }, null] }, { $gt: ['$planExpiresAt', now] }] }] },
  { $and: [{ $eq: ['$isFeatured', true] }, { $or: [{ $eq: [{ $ifNull: ['$featuredUntil', null] }, null] }, { $gt: ['$featuredUntil', now] }] }] },
] });
const matches = (input, source) => ({ $regexMatch: { input: { $ifNull: [input, ''] }, regex: source, options: 'i' } });
const anyMatches = (arrayExpr, source) => ({ $gt: [{ $size: { $filter: { input: { $ifNull: [arrayExpr, []] }, cond: matches('$$this', source) } } }, 0] });
// Higher score = better match. Premium listings get a boost, so they lead among similarly relevant results.
const relevanceExpr = (tokens, phrase) => {
  const parts = tokens.map(token => {
    const source = escapeRegex(token);
    return { $add: [
      { $cond: [matches('$name', source), 300, 0] },
      { $cond: [matches({ $arrayElemAt: ['$categoryDoc.name', 0] }, source), 200, 0] },
      { $cond: [anyMatches('$services', source), 100, 0] },
      { $cond: [anyMatches('$keywords', source), 80, 0] },
      { $cond: [{ $or: [matches('$address.locality', source), matches('$address.city', source)] }, 20, 0] },
    ] };
  });
  const exact = escapeRegex(phrase);
  parts.push({ $cond: [matches('$name', `^${exact}$`), 700, { $cond: [matches('$name', `^${exact}`), 400, 0] }] });
  return { $add: parts };
};
const caseInsensitiveExact = value => new RegExp(`^${String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
export const categories = () => async (req, res, next) => { try { const q = req.validated.query; const filter = { isActive: q.active ?? true }; if (q.parent) filter.parentCategory = q.parent; if (q.search) filter.$text = { $search: q.search }; sendSuccess(res, 'Categories retrieved successfully', await pageResult(Category, filter, req)); } catch (e) { next(e); } };
export const categoryBySlug = () => async (req, res, next) => { try { const item = await Category.findOne({ slug: req.params.slug, isActive: true }); if (!item) throw new AppError('Category not found', 404); sendSuccess(res, 'Category retrieved successfully', { item }); } catch (e) { next(e); } };
export const categoryTree = () => async (req,res,next) => { try { const found = Category.find({ isActive: true }).sort('displayOrder name'); if (req.query.lite === '1') found.select('name slug icon parentCategory description displayOrder'); const items = await found.lean(); const roots = []; const map = new Map(items.map(x => [String(x._id), { ...x, children: [] }])); for (const item of map.values()) item.parentCategory && map.has(String(item.parentCategory)) ? map.get(String(item.parentCategory)).children.push(item) : roots.push(item); sendSuccess(res,'Category tree retrieved successfully',{items:roots}); } catch(e){next(e);} };
export const locations = type => () => async (req,res,next) => { try { const q=req.validated.query; const filter={ type, isActive:true }; if(q.search) filter.name=new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'); if(q.state) { const state=await Location.findOne({slug:q.state,type:'state'}); filter.state=state?._id || null; } if(q.city) { const city=await Location.findOne({slug:q.city,type:'city'}); filter.city=city?._id || null; } sendSuccess(res,`${type}s retrieved successfully`,await pageResult(Location,filter,req)); } catch(e){next(e);} };
// Cities that have published businesses, busiest first, with how many businesses each has.
export const businessCities = () => async (req, res, next) => {
  try {
    const rows = await Business.aggregate([
      { $match: { listingStatus: 'published', deletedAt: null, 'address.city': { $type: 'string', $ne: '' } } },
      { $group: { _id: { $toLower: { $trim: { input: '$address.city' } } }, name: { $first: { $trim: { input: '$address.city' } } }, count: { $sum: 1 } } },
      { $sort: { count: -1, name: 1 } },
    ]);
    sendSuccess(res, 'Cities with published businesses retrieved successfully', { items: rows.map(row => ({ name: row.name, count: row.count })) });
  } catch (error) {
    next(error);
  }
};
// Every city + category pair that has published listings, with counts. Used for city hub pages, landing pages and the sitemap.
export const cityCategories = () => async (_req, res, next) => {
  try {
    const rows = await Business.aggregate([
      { $match: { listingStatus: 'published', deletedAt: null, 'address.city': { $type: 'string', $ne: '' }, category: { $ne: null } } },
      { $group: { _id: { city: { $toLower: { $trim: { input: '$address.city' } } }, category: '$category' }, cityName: { $first: { $trim: { input: '$address.city' } } }, count: { $sum: 1 }, updatedAt: { $max: '$updatedAt' } } },
      { $lookup: { from: 'categories', localField: '_id.category', foreignField: '_id', as: 'cat' } },
      { $unwind: '$cat' },
      { $match: { 'cat.isActive': true } },
      { $sort: { count: -1 } },
    ]);
    sendSuccess(res, 'City and category pairs retrieved successfully', { items: rows.map(row => ({ city: row.cityName, categoryId: String(row._id.category), categoryName: row.cat.name, categorySlug: row.cat.slug, icon: row.cat.icon || '', count: row.count, updatedAt: row.updatedAt })) });
  } catch (error) { next(error); }
};
const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const localClock = (date, timeZone) => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: timeZone || 'Asia/Kolkata', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { day: values.weekday.toLowerCase(), time: `${values.hour}:${values.minute}` };
  } catch { return localClock(date, 'Asia/Kolkata'); }
};
const businessIsOpenNow = (business, now = new Date()) => {
  const { day, time } = localClock(now, business.timeZone);
  const todayIndex = weekdayNames.indexOf(day);
  const yesterday = weekdayNames[(todayIndex + 6) % 7];
  return (business.workingHours || []).some(hours => {
    if (hours.isClosed || !hours.opens || !hours.closes) return false;
    if (hours.day === day && (hours.opens <= hours.closes ? hours.opens <= time && time < hours.closes : hours.opens <= time)) return true;
    return hours.day === yesterday && hours.opens > hours.closes && time < hours.closes;
  });
};
export const businessList = () => async (req,res,next) => { try {
  const q=req.validated.query;
  const filter={listingStatus:'published',deletedAt:null};
  if(q.q) {
    if (q.lat !== undefined) {
      const term = new RegExp(caseInsensitiveExact(q.q).source.slice(1, -1), 'i');
      filter.$or = [{ name: term }, { description: term }, { keywords: term }, { services: term }];
    } else {
      const tokens = searchTokens(q.q);
      if (tokens.length) filter.$and = filter.$and || [];
      for (const token of tokens) {
        const rx = new RegExp(escapeRegex(token), 'i');
        const categoryIds = await Category.find({ isActive: true, name: rx }).select('_id').limit(100).lean().then(rows => rows.map(row => row._id));
        filter.$and.push({ $or: [{ name: rx }, { keywords: rx }, { services: rx }, { description: rx }, { 'address.locality': rx }, { 'address.city': rx }, ...(categoryIds.length ? [{ category: { $in: categoryIds } }, { subcategories: { $in: categoryIds } }, { secondaryCategories: { $in: categoryIds } }] : [])] });
      }
    }
  }
  if(q.category) {
    const cat = await Category.findOne({ slug: q.category, isActive: true }).select('_id').lean();
    if (!cat) filter.category = null; else filter.$and = [...(filter.$and || []), { $or: [{ category: cat._id }, { subcategories: cat._id }, { secondaryCategories: cat._id }] }];
  }
  if (q.city) filter['address.city'] = caseInsensitiveExact(q.city.trim());
  if(q.locality) filter['address.locality']=q.q ? caseInsensitiveExact(q.locality) : q.locality;
  if(q.state) filter['address.state']=q.q ? caseInsensitiveExact(q.state) : q.state;
  if(q.verified === 'true') filter.verificationStatus='verified';
  if(q.verified === 'false') filter.verificationStatus={$ne:'verified'};
  if(q.minimumRating !== undefined) filter.averageRating={$gte:q.minimumRating};
  if(q.amenity) { const wanted = q.amenity.split(',').map(item => item.trim()).filter(Boolean); if (wanted.length) filter.amenities = { $all: wanted }; }
  if(q.hasPhotos === 'true') filter['images.0'] = { $exists: true };
  if(q.hasWebsite === 'true') filter.website = { $exists: true, $nin: ['', null] };
  if (q.lat !== undefined) {
    const pipeline = [
      { $geoNear: { near: { type: 'Point', coordinates: [q.lng, q.lat] }, key: 'location', distanceField: 'distanceMeters', maxDistance: q.radiusMeters, spherical: true, query: filter } },
      { $addFields: { hasGooglePlaceId: { $or: [{ $ne: [{ $ifNull: ['$googleBusinessProfileLocation', ''] }, ''] }, { $and: [{ $ne: [{ $ifNull: ['$googlePlaceId', ''] }, ''] }, { $ne: ['$googlePlaceVerificationStatus', 'mismatch'] }] }] } } },
      { $project: { owner: 0, rejectionReason: 0, googlePlaceId: 0, googlePlaceVerificationStatus: 0, googleBusinessProfileLocation: 0, googleBusinessProfileTitle: 0, googleBusinessProfileLinkedAt: 0, reviews: 0 } },
    ];
    if (q.openNow !== undefined) {
      let nearby = (await Business.aggregate(pipeline)).map(item => ({ ...item, isOpenNow: businessIsOpenNow(item) })).filter(item => item.isOpenNow === (q.openNow === 'true'));
      if (q.sort === 'rating') nearby.sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount || a.distanceMeters - b.distanceMeters);
      if (q.sort === 'newest') nearby.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || a.distanceMeters - b.distanceMeters);
      const totalItems = nearby.length;
      const items = nearby.slice((q.page - 1) * q.limit, q.page * q.limit).map(publicListing);
      await Business.populate(items, { path: 'category', select: 'name slug' });
      return sendSuccess(res, 'Nearby businesses retrieved successfully', { items, pagination: { page: q.page, limit: q.limit, totalItems, totalPages: Math.ceil(totalItems / q.limit), hasNextPage: q.page * q.limit < totalItems, hasPreviousPage: q.page > 1 } });
    }
    if (q.sort === 'rating') pipeline.push({ $sort: { averageRating: -1, reviewCount: -1, distanceMeters: 1, _id: 1 } });
    if (q.sort === 'newest') pipeline.push({ $sort: { createdAt: -1, distanceMeters: 1, _id: 1 } });
    pipeline.push({ $facet: { items: [{ $skip: (q.page - 1) * q.limit }, { $limit: q.limit }], count: [{ $count: 'totalItems' }] } });
    const [result = { items: [], count: [] }] = await Business.aggregate(pipeline);
    const items = result.items.map(item => ({ ...publicListing(item), isOpenNow: businessIsOpenNow(item) }));
    const totalItems = result.count[0]?.totalItems || 0;
    await Business.populate(items, { path: 'category', select: 'name slug' });
    return sendSuccess(res, 'Nearby businesses retrieved successfully', { items, pagination: { page: q.page, limit: q.limit, totalItems, totalPages: Math.ceil(totalItems / q.limit), hasNextPage: q.page * q.limit < totalItems, hasPreviousPage: q.page > 1 } });
  }
  if (q.openNow !== undefined) {
    const matching = (await Business.find(filter).select('-owner -rejectionReason -reviews -kycDocuments -msmeNumber').populate('category', 'name slug').sort(q.sort === 'rating' ? { averageRating: -1, reviewCount: -1, _id: 1 } : q.sort === 'newest' ? { createdAt: -1, _id: 1 } : { averageRating: -1, reviewCount: -1, _id: 1 }).limit(800).lean())
      .map(item => ({ ...item, isOpenNow: businessIsOpenNow(item) })).filter(item => item.isOpenNow === (q.openNow === 'true'));
    const totalItems = matching.length;
    const items = matching.slice((q.page - 1) * q.limit, q.page * q.limit).map(publicListing);
    return sendSuccess(res, 'Businesses retrieved successfully', { items, pagination: { page: q.page, limit: q.limit, totalItems, totalPages: Math.ceil(totalItems / q.limit), hasNextPage: q.page * q.limit < totalItems, hasPreviousPage: q.page > 1 } });
  }
  const now = new Date();
  const tokens = q.q ? searchTokens(q.q) : [];
  const orderBy = q.sort === 'rating' ? { averageRating: -1, reviewCount: -1, _id: 1 }
    : q.sort === 'newest' ? { createdAt: -1, _id: 1 }
      : { rankScore: -1, trustRank: -1, averageRating: -1, reviewCount: -1, photoRank: -1, _id: 1 };
  const pipeline = [
    { $match: filter },
    { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'categoryDoc', pipeline: [{ $project: { name: 1, slug: 1 } }] } },
    { $addFields: { premiumActive: premiumActiveExpr(now) } },
    { $addFields: {
      rankScore: { $add: [{ $cond: ['$premiumActive', 400, 0] }, tokens.length ? relevanceExpr(tokens, q.q.trim()) : 0] },
      trustRank: { $add: [{ $cond: [{ $eq: ['$verificationStatus', 'verified'] }, 2, 0] }, { $cond: [{ $eq: ['$kycStatus', 'verified'] }, 1, 0] }] },
      photoRank: { $min: [{ $ifNull: ['$photoCount', 0] }, 5] },
      isFeatured: '$premiumActive',
      category: { $arrayElemAt: ['$categoryDoc', 0] },
    } },
    { $sort: orderBy },
    { $project: { owner: 0, rejectionReason: 0, reviews: 0, kycDocuments: 0, msmeNumber: 0, categoryDoc: 0, premiumActive: 0, rankScore: 0, trustRank: 0, photoRank: 0 } },
    { $facet: { items: [{ $skip: (q.page - 1) * q.limit }, { $limit: q.limit }], count: [{ $count: 'totalItems' }] } },
  ];
  const [result = { items: [], count: [] }] = await Business.aggregate(pipeline);
  const totalItems = result.count[0]?.totalItems || 0;
  sendSuccess(res, 'Businesses retrieved successfully', { items: result.items.map(publicListing), pagination: { page: q.page, limit: q.limit, totalItems, totalPages: Math.ceil(totalItems / q.limit), hasNextPage: q.page * q.limit < totalItems, hasPreviousPage: q.page > 1 } });
}catch(e){next(e);} };
export const businessBySlug = () => async (req,res,next) => { try { const identifier=req.params.slug; const identityFilter=mongoose.isValidObjectId(identifier)?{_id:identifier}:{slug:identifier}; const item=await Business.findOne({...identityFilter,listingStatus:'published',deletedAt:null}).select('-owner -rejectionReason -kycDocuments -msmeNumber').populate('category','name slug').populate('subcategories','name slug').populate('secondaryCategories','name slug').lean(); if(!item) throw new AppError('Business not found',404); item.leadCount=await Lead.countDocuments({business:item._id}); sendSuccess(res,'Business retrieved successfully',{item:publicListing(item)}); }catch(e){next(e);} };
export const recordBusinessView = () => async (req, res, next) => {
  try {
    const item = await Business.findOne({ _id: req.params.id, listingStatus: 'published', deletedAt: null }).select('owner viewCount').lean();
    if (!item) throw new AppError('Business not found', 404);
    // The owner looking at their own page is not a customer view.
    if (req.user && String(item.owner) === String(req.user.id)) return sendSuccess(res, 'Owner views are not counted', { viewCount: item.viewCount });
    const updated = await Business.findOneAndUpdate({ _id: item._id }, { $inc: { viewCount: 1 } }, { new: true, projection: { viewCount: 1 } }).lean();
    await bump(item._id, 'views').catch(() => {});
    sendSuccess(res, 'Business view recorded', { viewCount: updated?.viewCount ?? item.viewCount });
  } catch (error) { next(error); }
};
// Counts a click on Call / WhatsApp / Directions / Website. Nothing about the visitor is stored.
export const recordBusinessEvent = () => async (req, res, next) => {
  try {
    const field = EVENT_FIELDS[req.validated.body.type];
    const business = await Business.findOne({ _id: req.params.id, listingStatus: 'published', deletedAt: null }).select('owner').lean();
    if (!business) throw new AppError('Business not found', 404);
    if (req.user && String(business.owner) === String(req.user.id)) return sendSuccess(res, 'Owner clicks are not counted');
    await bump(req.params.id, field);
    sendSuccess(res, 'Recorded');
  } catch (error) { next(error); }
};
export const createBusinessLead = (config, mailer) => async (req, res, next) => {
  try {
    const business = await Business.findOne({ _id: req.params.id, listingStatus: 'published', deletedAt: null }).select('_id name services owner').populate('owner', 'email name notificationPreferences').lean();
    if (!business) throw new AppError('Business not found', 404);
    const { name, phone, email, service, message } = req.validated.body;
    if (service && !business.services.includes(service)) throw new AppError('Select a service offered by this business', 422);
    // The same person sending the very same inquiry again within two minutes (double click, a reload that re-sends) is one inquiry, not two.
    const repeat = await Lead.findOne({ business: business._id, phone, message, createdAt: { $gt: new Date(Date.now() - 2 * 60 * 1000) } }).select('_id').lean();
    if (repeat) return sendSuccess(res, 'Your inquiry was sent to the business', { item: { id: String(repeat._id), leadCount: await Lead.countDocuments({ business: business._id }) } }, 201);
    const lead = await Lead.create({ business: business._id, ...(req.user?.id ? { user: req.user.id } : {}), name, phone, ...(email ? { email } : {}), ...(service ? { service } : {}), message });
    const leadCount = await Lead.countDocuments({ business: business._id });
    // Tell the owner by email (if they haven't turned it off). A mail problem never blocks the customer's inquiry.
    const owner = business.owner;
    if (mailer && owner?.email && owner.notificationPreferences?.email !== false) {
      const lines = [`${name} sent an inquiry about ${business.name}.`, '', `Phone: ${phone}`, ...(email ? [`Email: ${email}`] : []), ...(service ? [`Service: ${service}`] : []), '', message, '', `Open your dashboard to reply: ${config?.CLIENT_URL || ''}/business-owner`];
      mailer.send({ to: owner.email, subject: `New inquiry for ${business.name}`, text: lines.join('\n') }).catch(() => console.error('Inquiry email could not be sent'));
    }
    // Tell the customer it went through (to the email they gave, else their signed-in account). A mail problem never blocks the inquiry.
    const customerTo = email || req.user?.email;
    if (mailer && customerTo) mailer.send({ to: customerTo, subject: `Your inquiry to ${business.name} was sent`, template: { heading: 'Your inquiry was sent', greeting: `Hi ${name},`, preheader: `${business.name} will contact you on ${phone}.`, paragraphs: [`We passed your inquiry to ${business.name}. They will contact you on the number below.`], details: [['Business', business.name], ['Your phone', phone], ...(service ? [['Service', service]] : [])], quote: message, quoteLabel: 'Your message', button: req.user ? { label: 'Follow my inquiries', url: `${config?.CLIENT_URL || ''}/account?tab=inquiries` } : { label: 'Create a free account', url: `${config?.CLIENT_URL || ''}/register` }, note: req.user ? 'You can see replies and withdraw the inquiry from My account.' : 'With a free account you can follow your inquiries and save businesses.' } }).catch(() => console.error('Inquiry confirmation email could not be sent'));
    sendSuccess(res, 'Your inquiry was sent to the business', { item: { id: String(lead._id), leadCount } }, 201);
  } catch (error) { next(error); }
};

// Autocomplete for the search box: matching categories, businesses and cities.
export const suggest = () => async (req, res, next) => { try {
  const { q, city } = req.validated.query;
  const tokens = searchTokens(q);
  if (!tokens.length) return sendSuccess(res, 'Suggestions retrieved', { categories: [], businesses: [], cities: [] });
  const rx = new RegExp(escapeRegex(tokens[0]), 'i');
  const whole = new RegExp(escapeRegex(q.trim()), 'i');
  const cityFilter = city ? { 'address.city': caseInsensitiveExact(city) } : {};
  const [categories, businesses, cities] = await Promise.all([
    Category.find({ isActive: true, name: rx }).select('name slug parentCategory').sort('name').limit(5).lean(),
    Business.find({ listingStatus: 'published', deletedAt: null, ...cityFilter, $or: [{ name: whole }, { services: rx }, { keywords: rx }] })
      .select('name slug category address.city address.locality').populate('category', 'name slug').sort({ isFeatured: -1, averageRating: -1 }).limit(6).lean(),
    Business.distinct('address.city', { listingStatus: 'published', deletedAt: null, 'address.city': whole }),
  ]);
  sendSuccess(res, 'Suggestions retrieved', { categories, businesses, cities: cities.slice(0, 4) });
} catch (e) { next(e); } };

// Live offers across published listings: active, not expired, newest/ending-soonest first.
export const offersList = () => async (req, res, next) => { try {
  const { city, occasion, limit } = req.validated.query;
  const now = new Date();
  const filter = { listingStatus: 'published', deletedAt: null, ...(city ? { 'address.city': new RegExp(`^${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } : {}), 'offers.0': { $exists: true } };
  const businesses = await Business.find(filter).select('name slug images logo address category verificationStatus offers phone').populate('category', 'name slug').limit(300).lean();
  const items = [];
  for (const business of businesses) {
    for (const offer of business.offers || []) {
      if (offer.isActive === false) continue;
      if (offer.validFrom && new Date(offer.validFrom) > now) continue;
      if (offer.validUntil && new Date(offer.validUntil) < now) continue;
      if (occasion && String(offer.occasion || '').toLowerCase() !== occasion.toLowerCase()) continue;
      items.push({ _id: String(offer._id), title: offer.title, description: offer.description, code: offer.code, occasion: offer.occasion, howToAvail: offer.howToAvail, validUntil: offer.validUntil, business: { _id: String(business._id), name: business.name, slug: business.slug, image: business.images?.[0] || business.logo || '', city: business.address?.city, locality: business.address?.locality, category: business.category?.name, categorySlug: business.category?.slug, verified: business.verificationStatus === 'verified', phone: business.phone } });
    }
  }
  items.sort((a, b) => (a.validUntil ? new Date(a.validUntil).getTime() : Infinity) - (b.validUntil ? new Date(b.validUntil).getTime() : Infinity));
  const occasions = [...new Set(items.map(item => item.occasion).filter(Boolean))];
  sendSuccess(res, 'Offers retrieved successfully', { items: items.slice(0, limit), total: items.length, occasions });
} catch (e) { next(e); } };

// Filter options with counts for the directory sidebar (localities, amenities and quick filters inside the chosen city/category).
export const businessFacets = () => async (req, res, next) => { try {
  const { city, category, q } = req.validated.query;
  const filter = { listingStatus: 'published', deletedAt: null };
  if (city) filter['address.city'] = caseInsensitiveExact(city);
  if (category) { const cat = await Category.findOne({ slug: category, isActive: true }).select('_id').lean(); if (!cat) return sendSuccess(res, 'Facets retrieved', { total: 0, localities: [], amenities: [], counts: {} }); filter.$or = [{ category: cat._id }, { secondaryCategories: cat._id }]; }
  if (q) { const rx = new RegExp(escapeRegex(q), 'i'); filter.$and = [{ $or: [{ name: rx }, { keywords: rx }, { services: rx }, { description: rx }] }]; }
  const [result] = await Business.aggregate([
    { $match: filter },
    { $facet: {
      total: [{ $count: 'n' }],
      localities: [{ $match: { 'address.locality': { $nin: [null, ''] } } }, { $group: { _id: '$address.locality', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 12 }],
      amenities: [{ $unwind: '$amenities' }, { $group: { _id: '$amenities', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 10 }],
      verified: [{ $match: { verificationStatus: 'verified' } }, { $count: 'n' }],
      withPhotos: [{ $match: { 'images.0': { $exists: true } } }, { $count: 'n' }],
      withWebsite: [{ $match: { website: { $nin: ['', null] } } }, { $count: 'n' }],
      rated4: [{ $match: { averageRating: { $gte: 4 } } }, { $count: 'n' }],
      rated45: [{ $match: { averageRating: { $gte: 4.5 } } }, { $count: 'n' }],
    } },
  ]);
  const one = key => result[key]?.[0]?.n || 0;
  sendSuccess(res, 'Facets retrieved', { total: one('total'), localities: result.localities.map(item => ({ name: item._id, count: item.count })), amenities: result.amenities.map(item => ({ name: item._id, count: item.count })), counts: { verified: one('verified'), withPhotos: one('withPhotos'), withWebsite: one('withWebsite'), rated4: one('rated4'), rated45: one('rated45') } });
} catch (e) { next(e); } };
