import { Business } from '../models/Business.js';
import { Category } from '../models/Category.js';
import { Lead } from '../models/Lead.js';
import { BusinessDailyStat, dayKey } from '../models/BusinessDailyStat.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';
import { safeGooglePlacesError } from '../services/googlePlaces.js';
const forbidden = new Set(['owner','slug','verificationStatus','googlePlaceVerificationStatus','googleBusinessProfileLocation','googleBusinessProfileTitle','googleBusinessProfileLinkedAt','listingStatus','isFeatured','featuredUntil','averageRating','reviewCount','viewCount','photoCount','subscription','kycStatus','plan','planExpiresAt','leadCount','contactClickCount','rejectionReason','deletedAt']);
const clean = body => Object.fromEntries(Object.entries(body).filter(([key]) => !forbidden.has(key)));
const getOwned = async (id, owner) => { const item=await Business.findOne({_id:id,owner,deletedAt:null}); if(!item) throw new AppError('Business not found',404); return item; };
const slugify = value => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 160) || 'business';
const uniqueSlug = async name => { const base = slugify(name); let slug = base; let suffix = 2; while (await Business.exists({ slug })) slug = `${base}-${suffix++}`; return slug; };
const validateCategorySelection = async body => {
  if (!await Category.exists({ _id: body.category, isActive: true, parentCategory: null })) throw new AppError('Category not found', 422);
  if (body.subcategories?.length) {
    const validCount = await Category.countDocuments({ _id: { $in: body.subcategories }, isActive: true, parentCategory: body.category });
    if (validCount !== new Set(body.subcategories.map(String)).size) throw new AppError('Select subcategories belonging to the chosen category', 422);
  }
  if (body.secondaryCategories?.length) {
    const ids = [...new Set(body.secondaryCategories.map(String))];
    if (ids.includes(String(body.category))) throw new AppError('The primary category cannot also be an additional category', 422);
    if (await Category.countDocuments({ _id: { $in: ids }, isActive: true }) !== ids.length) throw new AppError('One or more additional categories were not found', 422);
  }
};
const verifyGooglePlace = async (placesService, placeId, business) => {
  if (!placeId) return { googlePlaceId: undefined, googlePlaceVerificationStatus: 'unverified' };
  try {
    return { googlePlaceId: placeId, googlePlaceVerificationStatus: await placesService.verifyPlaceId(placeId, business) };
  } catch (error) {
    if (error?.name === 'GooglePlacesError') {
      const [status, message] = safeGooglePlacesError(error);
      throw new AppError(message, status);
    }
    throw error;
  }
};
export const createBusiness = placesService => async(req,res,next)=>{try{const body=clean(req.validated.body); if(!body.description||!body.phone||!body.address?.addressLine1||!body.services?.length) throw new AppError('Description, phone, address line 1, and at least one service are required before submission',422); await validateCategorySelection(body); const googlePlace = await verifyGooglePlace(placesService, body.googlePlaceId, body); const item=await Business.create({...body,...googlePlace,slug:await uniqueSlug(body.name),owner:req.user.id,listingStatus:'pending_review',verificationStatus:'pending'}); await item.populate('category','name'); sendSuccess(res,'Business created successfully',{item},201);}catch(e){next(e);}};
export const ownerBusinesses = () => async(req,res,next)=>{try{const {page,limit}=req.validated.query;const filter={owner:req.user.id,deletedAt:null}; const [items,totalItems]=await Promise.all([Business.find(filter).populate('category','name').skip((page-1)*limit).limit(limit),Business.countDocuments(filter)]);const ids=items.map(item=>item._id);const counts=ids.length?await Lead.aggregate([{ $match:{business:{ $in:ids }} },{ $group:{_id:'$business',count:{ $sum:1 }} }]):[];const countByBusiness=new Map(counts.map(item=>[String(item._id),item.count]));for(const item of items)item.leadCount=countByBusiness.get(String(item._id))||0;sendSuccess(res,'Businesses retrieved successfully',{items,pagination:{page,limit,totalItems,totalPages:Math.ceil(totalItems/limit),hasNextPage:page*limit<totalItems,hasPreviousPage:page>1}});}catch(e){next(e);}};
export const ownerLeads = () => async (req, res, next) => {
  try {
    const businesses = await Business.find({ owner: req.user.id, deletedAt: null }).select('_id').lean();
    const businessIds = businesses.map(item => item._id);
    const items = businessIds.length
      ? await Lead.find({ business: { $in: businessIds } }).populate('business', 'name').sort('-createdAt').limit(100).lean()
      : [];
    sendSuccess(res, 'Business inquiries retrieved successfully', { items });
  } catch (error) { next(error); }
};
export const updateOwnerLead = () => async (req, res, next) => {
  try {
    const businessIds = await Business.find({ owner: req.user.id, deletedAt: null }).distinct('_id');
    const item = await Lead.findOneAndUpdate(
      { _id: req.params.id, business: { $in: businessIds } },
      { $set: { status: req.validated.body.status } },
      { new: true },
    ).populate('business', 'name').lean();
    if (!item) throw new AppError('Inquiry not found', 404);
    sendSuccess(res, 'Inquiry status updated', { item });
  } catch (error) { next(error); }
};
export const addOwnerLeadNote = () => async (req, res, next) => {
  try {
    const businessIds = await Business.find({ owner: req.user.id, deletedAt: null }).distinct('_id');
    const item = await Lead.findOne({ _id: req.params.id, business: { $in: businessIds } });
    if (!item) throw new AppError('Inquiry not found', 404);
    if (item.notes.length >= 50) throw new AppError('An inquiry can have at most 50 follow-up notes', 422);
    item.notes.push(req.validated.body.note);
    await item.save();
    await item.populate('business', 'name');
    sendSuccess(res, 'Follow-up note added', { item });
  } catch (error) { next(error); }
};
export const ownerBusiness = () => async(req,res,next)=>{try{sendSuccess(res,'Business retrieved successfully',{item:await getOwned(req.params.id,req.user.id)});}catch(e){next(e);}};
export const updateBusiness = placesService => async (req, res, next) => {
  let stage = 'load business';
  try {
    const item = await getOwned(req.params.id, req.user.id);
    stage = 'validate update';
    const body = clean(req.validated.body);
    if (Object.hasOwn(body, 'googlePlaceId') && body.googlePlaceId !== item.googlePlaceId) {
      Object.assign(body, await verifyGooglePlace(placesService, body.googlePlaceId, { ...item.toObject(), ...body }));
    }
    if (body.category || body.subcategories || body.secondaryCategories) {
      await validateCategorySelection({ category: body.category || item.category, subcategories: body.subcategories ?? item.subcategories, secondaryCategories: body.secondaryCategories ?? item.secondaryCategories });
    }

    stage = 'apply update';
    Object.assign(item, body);
    if (['draft', 'rejected'].includes(item.listingStatus)) {
      if (!item.description || !item.phone || !item.address?.addressLine1 || !item.services?.length) {
        throw new AppError('Description, phone, address line 1, and at least one service are required before submission', 422);
      }
      item.listingStatus = 'pending_review';
      item.verificationStatus = 'pending';
      item.rejectionReason = undefined;
    }

    stage = 'save business';
    await item.save();
    stage = 'populate category';
    await item.populate('category', 'name');
    sendSuccess(res, 'Business updated successfully', { item });
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error('Owner business update failed', {
        stage,
        type: error.name || 'Error',
        code: error.code || undefined,
      });
    }
    next(error);
  }
};
export const removeBusiness = () => async(req,res,next)=>{try{const item=await getOwned(req.params.id,req.user.id);item.deletedAt=new Date();item.listingStatus='deleted';await item.save();res.status(204).end();}catch(e){next(e);}};
export const submitBusiness = () => async(req,res,next)=>{try{const item=await getOwned(req.params.id,req.user.id);if(!['draft','rejected'].includes(item.listingStatus))throw new AppError('This listing cannot be submitted',409);if(!item.description||!item.phone||!item.address?.addressLine1||!item.services?.length)throw new AppError('Description, phone, address, and at least one service are required before submission',422);item.listingStatus='pending_review';item.verificationStatus='pending';item.rejectionReason=undefined;await item.save();sendSuccess(res,'Business submitted for review',{item});}catch(e){next(e);}};

const FIELDS = ['views', 'calls', 'whatsapp', 'directions', 'website'];
const emptyDay = day => ({ day, views: 0, calls: 0, whatsapp: 0, directions: 0, website: 0, inquiries: 0 });
const daysBack = (count, offset = 0) => Array.from({ length: count }, (_, index) => dayKey(new Date(Date.now() - (count - 1 - index + offset) * 86400000)));

// Daily series for the owner's listings (all, or one), plus the previous period for comparison.
export const ownerAnalytics = () => async (req, res, next) => { try {
  const { days, business } = req.validated.query;
  const owned = await Business.find({ owner: req.user.id, deletedAt: null }).select('_id name').lean();
  const ids = business ? owned.filter(item => String(item._id) === business).map(item => item._id) : owned.map(item => item._id);
  if (business && !ids.length) throw new AppError('Business not found', 404);
  const current = daysBack(days); const previous = daysBack(days, days);
  const since = new Date(Date.now() - days * 2 * 86400000 - 86400000);
  const [stats, leads] = await Promise.all([
    BusinessDailyStat.find({ business: { $in: ids }, day: { $gte: previous[0], $lte: current[current.length - 1] } }).lean(),
    Lead.aggregate([{ $match: { business: { $in: ids }, createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, count: { $sum: 1 } } }]),
  ]);
  const byDay = new Map([...previous, ...current].map(day => [day, emptyDay(day)]));
  for (const row of stats) { const target = byDay.get(row.day); if (target) FIELDS.forEach(field => { target[field] += row[field] || 0; }); }
  for (const row of leads) { const target = byDay.get(row._id); if (target) target.inquiries += row.count; }
  const sum = list => list.reduce((acc, item) => { [...FIELDS, 'inquiries'].forEach(field => { acc[field] += item[field]; }); return acc; }, emptyDay(''));
  const series = current.map(day => byDay.get(day));
  const prevSeries = previous.map(day => byDay.get(day));
  sendSuccess(res, 'Analytics retrieved successfully', { days, series, totals: sum(series), previous: sum(prevSeries), businesses: owned.map(item => ({ id: String(item._id), name: item.name })) });
} catch (e) { next(e); } };

export const replyToReview = () => async (req, res, next) => { try {
  const item = await getOwned(req.params.id, req.user.id);
  const review = item.reviews.id(req.params.reviewId);
  if (!review) throw new AppError('Review not found', 404);
  review.reply = { text: req.validated.body.text, createdAt: new Date() };
  await item.save();
  sendSuccess(res, 'Your reply is now public', { reply: review.reply });
} catch (e) { next(e); } };
export const removeReviewReply = () => async (req, res, next) => { try {
  const item = await getOwned(req.params.id, req.user.id);
  const review = item.reviews.id(req.params.reviewId);
  if (!review) throw new AppError('Review not found', 404);
  review.reply = undefined;
  await item.save();
  sendSuccess(res, 'Reply removed');
} catch (e) { next(e); } };

// Owners can hide a live listing for a while and bring it back. Only live or paused listings can be switched.
export const setVisibility = () => async (req, res, next) => { try {
  const item = await getOwned(req.params.id, req.user.id);
  const visible = req.validated.body.visible;
  if (visible && item.listingStatus !== 'paused') throw new AppError(item.listingStatus === 'published' ? 'This listing is already live' : 'Only a paused listing can be resumed', 409);
  if (!visible && item.listingStatus !== 'published') throw new AppError('Only a live listing can be paused', 409);
  item.listingStatus = visible ? 'published' : 'paused';
  await item.save();
  sendSuccess(res, visible ? 'Your listing is live again' : 'Your listing is paused and hidden from customers', { item: { id: String(item._id), listingStatus: item.listingStatus } });
} catch (e) { next(e); } };
