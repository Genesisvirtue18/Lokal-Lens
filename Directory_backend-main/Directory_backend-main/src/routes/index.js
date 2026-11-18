import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { cloudinary, configureCloudinary } from '../config/cloudinary.js';
import { healthController } from '../controllers/healthController.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authenticate, authorizeRoles, softAuthenticate } from '../middleware/auth.js';
import * as auth from '../controllers/authController.js';
import * as users from '../controllers/userController.js';
import * as directory from '../controllers/directoryController.js';
import * as owner from '../controllers/ownerBusinessController.js';
import * as admin from '../controllers/adminController.js';
import * as reviews from '../controllers/reviewController.js';
import { createMailer } from '../services/mailer.js';
import * as people from '../controllers/adminPeopleController.js';
import * as ops from '../controllers/adminOpsController.js';
import { auditAdmin } from '../middleware/audit.js';
import { requirePassword } from '../middleware/stepUp.js';
import { createGoogleReviewsController } from '../controllers/googlePlacesController.js';
import { geocodeAddress } from '../services/geocodingService.js';
import { createGooglePlacesService } from '../services/googlePlaces.js';
import { createGoogleBusinessProfileService } from '../services/googleBusinessProfile.js';
import { createGoogleBusinessProfileController } from '../controllers/googleBusinessProfileController.js';
import { authLogin, authRegister, idParam, objectId, pagination, refreshSchema } from '../validators/common.js';
import { sendError, sendSuccess } from '../utils/response.js';

const pageQuery = pagination.extend({ search: z.string().trim().max(100).optional(), parent: objectId.optional(), active: z.coerce.boolean().optional(), state: z.string().max(180).optional(), city: z.string().max(180).optional() });
const httpUrl = z.url().refine(value => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); }
  catch { return false; }
}, 'Use an HTTP(S) URL');
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, done) => done(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)),
});
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 }, fileFilter: (_req, file, done) => done(null, /\.(csv|txt)$/i.test(file.originalname)) });
const businessBody = z.object({ name:z.string().trim().min(2).max(180), slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180).optional(), category:objectId, description:z.string().max(10000).optional(), phone:z.string().max(30).optional(), alternatePhone:z.string().max(30).optional(), whatsapp:z.string().max(30).optional(), email:z.string().email().optional(), website:httpUrl.optional(), address:z.object({addressLine1:z.string().max(250).optional(),addressLine2:z.string().max(250).optional(),landmark:z.string().max(150).optional(),city:z.string().max(120).optional(),locality:z.string().max(120).optional(),state:z.string().max(120).optional(),postalCode:z.string().max(20).optional(),country:z.string().length(2).optional()}).partial().optional(), workingHours:z.array(z.object({day:z.enum(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),isClosed:z.boolean().optional(),opens:z.string().optional(),closes:z.string().optional()})).max(7).optional(), logo:httpUrl.optional(),images:z.array(httpUrl).max(30).optional(),photoCount:z.coerce.number().int().min(0).optional(),priceRange:z.enum(['budget','moderate','expensive','luxury']).optional(),keywords:z.array(z.string().max(80)).max(30).optional(),highlights:z.array(z.string().max(180)).max(30).optional(),amenities:z.array(z.string().max(180)).max(50).optional(),establishedYear:z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional(),teamSize:z.coerce.number().int().min(1).optional(),responseTimeMinutes:z.coerce.number().int().min(0).optional(),mapEmbedUrl:httpUrl.optional(),socialLinks:z.object({facebook:httpUrl.optional(),instagram:httpUrl.optional(),linkedin:httpUrl.optional(),youtube:httpUrl.optional(),x:httpUrl.optional()}).optional(),faqs:z.array(z.object({question:z.string().min(1).max(500),answer:z.string().min(1).max(3000)})).max(50).optional(),offers:z.array(z.object({title:z.string().min(1).max(180),description:z.string().max(2000).optional(),code:z.string().max(50).optional(),occasion:z.string().max(40).optional(),validFrom:z.coerce.date().optional(),validUntil:z.coerce.date().optional(),isActive:z.boolean().optional()})).max(30).optional(),subcategories:z.array(objectId).max(30).optional(),services:z.array(z.string().max(150)).max(100).optional(),reviews:z.array(z.object({reviewerName:z.string().min(1).max(120),reviewerAvatar:httpUrl.optional(),rating:z.coerce.number().min(1).max(5),comment:z.string().max(3000).optional(),isVerified:z.boolean().optional(),createdAt:z.coerce.date().optional()})).max(100).optional(),testimonials:z.array(z.object({name:z.string().trim().min(1).max(120),quote:z.string().trim().min(1).max(2000)})).max(20).optional(),timeZone:z.string().max(120).optional() }).strict();
const emptyableUrl = httpUrl.or(z.literal(''));
const googleMapsUrl = emptyableUrl.refine(value => {
  if (!value) return true;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === 'maps.app.goo.gl' || host === 'goo.gl' || host === 'google.com' || host.endsWith('.google.com') || host === 'google.co.in' || host.endsWith('.google.co.in');
  } catch { return false; }
}, 'Use a Google Maps link');
export const ownerBusinessBody = businessBody.omit({ reviews: true, slug: true, photoCount: true, website: true, email: true, logo: true, mapEmbedUrl: true, socialLinks: true }).extend({
  website: emptyableUrl.optional(), email: z.union([z.string().email(), z.literal('')]).optional(), logo: emptyableUrl.optional(), mapEmbedUrl: googleMapsUrl.optional(),
  googlePlaceId: z.string().trim().max(600).transform(value => value.replace(/\s+/g, '')).pipe(z.string().max(300).regex(/^(?:[A-Za-z0-9_-]{1,300})?$/, 'Enter a valid Google Place ID')).optional(),
  phone: z.string().regex(/^[1-9]\d{9}$/, 'Enter a valid 10-digit Indian phone number'),
  alternatePhone: z.union([z.string().regex(/^[1-9]\d{9}$/), z.literal('')]).optional(),
  whatsapp: z.union([z.string().regex(/^[1-9]\d{9}$/), z.literal('')]).optional(),
  services: z.array(z.string().trim().min(1).max(150)).min(1, 'Select at least one service'),
  address: z.object({ addressLine1: z.string().trim().min(1).max(250), addressLine2: z.string().max(250).optional(), landmark: z.string().max(150).optional(), city: z.string().trim().min(1).max(120), locality: z.string().max(120).optional(), state: z.string().trim().min(1).max(120), postalCode: z.string().max(20).optional(), country: z.string().length(2).optional() }),
  secondaryCategories: z.array(objectId).max(9, 'Choose at most 9 additional categories').optional(),
  serviceItems: z.array(z.object({ name: z.string().trim().min(1).max(150), description: z.string().trim().max(300).optional(), priceFrom: z.coerce.number().min(0).max(100000000).optional(), priceTo: z.coerce.number().min(0).max(100000000).optional(), unit: z.string().trim().max(30).optional() })).max(100).optional(),
  serviceMode: z.enum(['visit', 'travel', 'both']).optional(),
  specialHours: z.array(z.object({ label: z.string().trim().min(1).max(120), date: z.string().trim().max(20).optional(), isClosed: z.boolean().optional(), opens: z.string().optional(), closes: z.string().optional() })).max(30).optional(),
  tagline: z.string().trim().max(160).optional(),
  legalName: z.string().trim().max(180).optional(),
  businessType: z.enum(['shop', 'service_provider', 'restaurant', 'manufacturer', 'wholesaler', 'online', 'clinic', 'institute', 'other']).optional(),
  contactPerson: z.object({ name: z.string().trim().max(120).optional(), designation: z.string().trim().max(120).optional() }).optional(),
  landline: z.union([z.string().regex(/^[0-9+\-\s()]{6,20}$/, 'Enter a valid landline number'), z.literal('')]).optional(),
  tollFree: z.union([z.string().regex(/^[0-9+\-\s()]{6,20}$/, 'Enter a valid toll-free number'), z.literal('')]).optional(),
  gstNumber: z.union([z.string().trim().toUpperCase().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Enter a valid 15-character GST number'), z.literal('')]).optional(),
  msmeNumber: z.string().trim().max(30).optional(),
  kycDocuments: z.array(z.object({ type: z.enum(['gst_certificate', 'msme_certificate', 'shop_license', 'pan_card', 'aadhaar', 'other']), url: httpUrl })).max(10).optional(),
  paymentModes: z.array(z.enum(['cash', 'upi', 'debit_card', 'credit_card', 'net_banking', 'cheque', 'emi', 'wallet'])).max(8).optional(),
  serviceAreas: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
  languages: z.array(z.string().trim().min(1).max(40)).max(15).optional(),
  homeDelivery: z.boolean().optional(),
  videoUrl: emptyableUrl.optional(),
  brochureUrl: emptyableUrl.optional(),
  workingHours: z.array(z.object({ day: z.enum(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']), isClosed: z.boolean().optional(), is24Hours: z.boolean().optional(), opens: z.string().optional(), closes: z.string().optional(), breakStart: z.string().optional(), breakEnd: z.string().optional() })).max(7).optional(),
  socialLinks: z.object({ facebook: emptyableUrl.optional(), instagram: emptyableUrl.optional(), linkedin: emptyableUrl.optional(), youtube: emptyableUrl.optional(), x: emptyableUrl.optional() }).optional(),
  location: z.object({ type: z.literal('Point').default('Point'), coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]) }).nullable().optional(),
  locationApproximate: z.boolean().optional(),
});
const ownerBusinessUpdateBody = ownerBusinessBody.partial().extend({
  phone: z.union([z.string().regex(/^[1-9]\d{9}$/), z.literal('')]).optional(),
  alternatePhone: z.union([z.string().regex(/^[1-9]\d{9}$/), z.literal('')]).optional(),
  whatsapp: z.union([z.string().regex(/^[1-9]\d{9}$/), z.literal('')]).optional(),
  services: z.array(z.string().trim().min(1).max(150)).max(100).optional(),
});

export function apiRouter(config, databaseState, { placesService: injectedPlacesService } = {}) {
  const router = Router();
  const mailer = createMailer(config);
  const places = injectedPlacesService || createGooglePlacesService(config);
  const googleBusinessProfile = createGoogleBusinessProfileService(config);
  const gbp = createGoogleBusinessProfileController(googleBusinessProfile, config);
  const googleReviewsLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.GOOGLE_PLACES_RATE_LIMIT_MAX || 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => sendError(res, 429, 'Google review request limit reached. Please try again later.'),
  });
  const businessViewLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => sendError(res, 429, 'Profile view tracking limit reached. Please try again later.'),
  });
  const businessEventLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false, handler: (_req, res) => sendError(res, 429, 'Too many requests.') });
  const businessLeadLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => sendError(res, 429, 'Inquiry limit reached. Please try again later.'),
  });
  router.get('/health', healthController(config, databaseState));
  router.get('/google-business-profile/callback', gbp.callback());
  const strictLimit = (max, message) => rateLimit({ windowMs: 15 * 60 * 1000, limit: max, standardHeaders: 'draft-8', legacyHeaders: false, handler: (_req, res) => sendError(res, 429, message) });
  const resetLimit = strictLimit(5, 'Too many password reset attempts. Please try again later.');
  const loginLimit = strictLimit(12, 'Too many sign-in attempts. Please wait a few minutes and try again.');
  const registerLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, handler: (_req, res) => sendError(res, 429, 'Too many sign-ups from this network. Please try again later.') });
  const refreshLimit = strictLimit(120, 'Too many requests. Please try again shortly.');
  const adminWriteLimit = rateLimit({ windowMs: 60 * 1000, limit: 120, skip: (req) => req.method === 'GET', standardHeaders: 'draft-8', legacyHeaders: false, handler: (_req, res) => sendError(res, 429, 'Slow down. Too many admin changes in a minute.') });
  const reviewLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, handler: (_req, res) => sendError(res, 429, 'Review limit reached. Please try again later.') });
  router.post('/auth/forgot-password', resetLimit, validate(z.object({ body: z.object({ email: z.string().email() }).strict() })), auth.forgotPassword(config, mailer));
  router.post('/auth/reset-password', resetLimit, validate(z.object({ body: z.object({ token: z.string().min(20).max(200), password: z.string().min(8).max(128) }).strict() })), auth.resetPassword());
  router.get('/search/suggest', validate(z.object({ query: z.object({ q: z.string().trim().min(1).max(60), city: z.string().trim().max(120).optional() }) })), directory.suggest());
  router.get('/businesses/:id/reviews', validate(idParam), reviews.listReviews());
  router.post('/businesses/:id/reviews', reviewLimit, authenticate(config), validate(idParam.extend({ body: z.object({ rating: z.coerce.number().int().min(1).max(5), comment: z.string().trim().max(3000).optional() }).strict() })), reviews.upsertReview(config, mailer));
  const otpLimit = strictLimit(20, 'Too many code requests. Please try again in a few minutes.');
  router.post('/auth/otp/request', otpLimit, validate(z.object({ body: z.object({ email: z.string().email().transform(value => value.trim().toLowerCase()), name: z.string().trim().min(2).max(120).optional() }).strict() })), auth.requestOtp(config, mailer));
  router.post('/auth/otp/verify', otpLimit, validate(z.object({ body: z.object({ email: z.string().email().transform(value => value.trim().toLowerCase()), code: z.string().regex(/^\d{6}$/) }).strict() })), auth.verifyOtp(config));
  router.post('/auth/change-password', authenticate(config), strictLimit(10, 'Too many attempts. Please try again in a few minutes.'), validate(z.object({ body: z.object({ currentPassword: z.string().max(128).optional(), newPassword: z.string().min(8).max(128) }).strict() })), auth.changePassword(config));
  router.post('/auth/register', registerLimit, validate(authRegister), auth.register(config));
  router.post('/auth/login', loginLimit, validate(authLogin), auth.login(config));
  router.post('/auth/refresh-token', refreshLimit, validate(refreshSchema), auth.refresh(config));
  router.post('/auth/logout', validate(refreshSchema), auth.logout());
  router.get('/auth/me', authenticate(config), auth.me());
  router.get('/auth/sessions', authenticate(config), auth.sessions());
  router.delete('/auth/sessions', authenticate(config), auth.revokeAll());
  router.delete('/auth/sessions/:sessionId', authenticate(config), auth.revokeSession());
  router.get('/users/me', authenticate(config), users.profile());
  router.patch('/users/me', authenticate(config), validate(z.object({body:z.object({name:z.string().trim().min(2).max(120).optional(),phone:z.string().max(30).optional(),avatar:z.url().optional(),notificationPreferences:z.object({email:z.boolean().optional(),sms:z.boolean().optional()}).optional()}).strict()})), users.updateProfile());
  router.delete('/users/me', authenticate(config), users.deleteAccount());
  router.get('/users/me/activity', authenticate(config), users.activity());
  router.get('/categories', validate(z.object({query:pageQuery})), directory.categories());
  router.get('/categories/popular', validate(z.object({query:pagination})), (req,res,next)=>{req.validated.query={...req.validated.query}; directory.categories()(req,res,next);});
  router.get('/categories/tree', directory.categoryTree());
  router.get('/categories/:slug', directory.categoryBySlug());
  router.get('/locations/states', validate(z.object({query:pageQuery})), directory.locations('state'));
  router.get('/locations/business-cities', directory.businessCities());
  router.get('/locations/cities', validate(z.object({query:pageQuery})), directory.locations('city'));
  router.get('/locations/localities', validate(z.object({query:pageQuery})), directory.locations('locality'));
  router.get('/locations/popular-cities', validate(z.object({query:pagination})), directory.locations('city'));
  const ownerOnly = [authenticate(config), authorizeRoles('business_owner', 'admin', 'super_admin')];
  const businessOwnerOnly = [authenticate(config), authorizeRoles('business_owner')];
  router.get('/owner/google-business-profile/status', ...businessOwnerOnly, gbp.status());
  router.post('/owner/google-business-profile/connect', ...businessOwnerOnly, gbp.connect());
  router.delete('/owner/google-business-profile/connection', ...businessOwnerOnly, gbp.disconnect());
  router.get('/owner/businesses/:id/google/locations', ...businessOwnerOnly, validate(idParam), gbp.locations());
  router.put('/owner/businesses/:id/google/location', ...businessOwnerOnly, validate(idParam.extend({ body: z.object({ locationName: z.string().trim().regex(/^accounts\/[^/]+\/locations\/[^/]+$/).max(300) }).strict() })), gbp.selectLocation());
  router.delete('/owner/businesses/:id/google/location', ...businessOwnerOnly, validate(idParam), gbp.unlinkLocation());
  const geocodeQuery = z.object({ query: z.object({
    addressLine1: z.string().trim().min(1).max(250),
    addressLine2: z.string().trim().max(250).optional(),
    landmark: z.string().trim().max(150).optional(),
    locality: z.string().trim().max(120).optional(),
    city: z.string().trim().min(1).max(120),
    state: z.string().trim().min(1).max(120),
    postalCode: z.string().trim().max(20).optional(),
    country: z.string().trim().length(2).optional(),
  }) });
  router.get('/owner/geocode', ...ownerOnly, validate(geocodeQuery), async (req, res) => {
    try {
      const point = await geocodeAddress(req.validated.query);
      if (!point) return sendError(res, 404, 'No map result matched the city, state, and postal code you entered. Check those address fields and try again.');
      return sendSuccess(res, 'Address located successfully', { point });
    } catch (error) {
      console.error('Address lookup failed', { type: error.name || 'Error' });
      return sendError(res, 503, 'Address lookup is temporarily unavailable. Please retry in a moment.');
    }
  });
  router.post('/owner/uploads', ...ownerOnly, imageUpload.array('images', 10), (req, res) => {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ success: false, message: 'Select at least one image', errors: [] });
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = config;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return res.status(503).json({ success: false, message: 'Image uploads are not configured. The site administrator must add the Cloudinary cloud name, API key, and API secret to the server environment.', errors: [] });
    }
    configureCloudinary(config);
    Promise.all(files.map(async file => {
      const detected = await fileTypeFromBuffer(file.buffer);
      if (!detected || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(detected.mime)) {
        const error = new Error('Only valid JPEG, PNG, WebP, or GIF images are allowed');
        error.status = 400;
        throw error;
      }
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream({ folder: 'business-directory', resource_type: 'image' }, (error, result) => {
          if (error) return reject(error);
          if (!result?.secure_url) return reject(new Error('Cloudinary did not return an image URL'));
          resolve(result.secure_url);
        }).end(file.buffer);
      });
    })).then(urls => sendSuccess(res, 'Images uploaded successfully', { urls }, 201)).catch(error => {
      if (error.status) return res.status(error.status).json({ success: false, message: error.message, errors: [] });
      console.error('Image upload provider failed', {
        type: error.name || 'Error',
        status: error.http_code || error.status || undefined,
        code: error.code || error.error?.code || undefined,
      });
      res.status(502).json({ success: false, message: 'Unable to upload images', errors: [] });
    });
  });
  const documentUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 5 } });
  router.post('/owner/documents', ...ownerOnly, documentUpload.array('files', 5), async (req, res) => {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ success: false, message: 'Select at least one file', errors: [] });
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = config;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return res.status(503).json({ success: false, message: 'File uploads are not configured. The site administrator must add the Cloudinary credentials to the server environment.', errors: [] });
    configureCloudinary(config);
    try {
      const urls = await Promise.all(files.map(async file => {
        const detected = await fileTypeFromBuffer(file.buffer);
        if (!detected || !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(detected.mime)) throw Object.assign(new Error('Only PDF, JPEG, PNG or WebP files are allowed'), { status: 400 });
        return new Promise((resolve, reject) => cloudinary.uploader.upload_stream({ folder: 'business-directory/documents', resource_type: detected.mime === 'application/pdf' ? 'raw' : 'image', ...(detected.mime === 'application/pdf' ? { format: 'pdf' } : {}) }, (error, result) => (error || !result?.secure_url ? reject(error || new Error('Upload failed')) : resolve(result.secure_url))).end(file.buffer));
      }));
      sendSuccess(res, 'Files uploaded successfully', { urls }, 201);
    } catch (error) {
      if (error.status) return res.status(error.status).json({ success: false, message: error.message, errors: [] });
      console.error('Document upload provider failed', { type: error.name || 'Error' });
      res.status(502).json({ success: false, message: 'Unable to upload files', errors: [] });
    }
  });
  router.get('/owner/businesses', ...ownerOnly, validate(z.object({query:pagination})), owner.ownerBusinesses());
  router.post('/owner/businesses', ...ownerOnly, validate(z.object({body:ownerBusinessBody.extend({ email: z.string().email('Enter a valid email address') })})), owner.createBusiness(places));
  router.get('/owner/analytics', ...ownerOnly, validate(z.object({ query: z.object({ days: z.coerce.number().int().refine(value => [7, 30, 90].includes(value), 'Choose 7, 30 or 90 days').default(30), business: objectId.optional() }) })), owner.ownerAnalytics());
  router.put('/owner/businesses/:id/reviews/:reviewId/reply', ...ownerOnly, validate(idParam.extend({ params: z.object({ id: objectId, reviewId: objectId }), body: z.object({ text: z.string().trim().min(2, 'Write at least 2 characters').max(1000) }).strict() })), owner.replyToReview());
  router.delete('/owner/businesses/:id/reviews/:reviewId/reply', ...ownerOnly, validate(idParam.extend({ params: z.object({ id: objectId, reviewId: objectId }) })), owner.removeReviewReply());
  router.post('/owner/businesses/:id/visibility', ...ownerOnly, validate(idParam.extend({ body: z.object({ visible: z.boolean() }).strict() })), owner.setVisibility());
  router.get('/owner/leads', ...ownerOnly, validate(z.object({ query: pagination })), owner.ownerLeads());
  router.patch('/owner/leads/:id', ...ownerOnly, validate(idParam.extend({ body: z.object({ status: z.enum(['new', 'contacted', 'converted']) }).strict() })), owner.updateOwnerLead());
  router.post('/owner/leads/:id/notes', ...ownerOnly, validate(idParam.extend({ body: z.object({ note: z.string().trim().min(1).max(1000) }).strict() })), owner.addOwnerLeadNote());
  router.get('/owner/businesses/:id', ...ownerOnly, validate(idParam), owner.ownerBusiness());
  router.patch('/owner/businesses/:id', ...ownerOnly, validate(idParam.extend({body:ownerBusinessUpdateBody})), owner.updateBusiness(places));
  router.delete('/owner/businesses/:id', ...ownerOnly, validate(idParam), owner.removeBusiness());
  router.post('/owner/businesses/:id/submit', ...ownerOnly, validate(idParam), owner.submitBusiness());
  const adminOnly = [authenticate(config), authorizeRoles('admin', 'super_admin')];
  const categoryBody = z.object({ name: z.string().trim().min(2).max(120), parentCategory: objectId.optional(), icon: z.string().regex(/^[a-z0-9-]{2,40}$/, 'Choose an icon from the list').optional() }).strict();
  const categoryUpdateBody = z.object({ name: z.string().trim().min(2).max(120).optional(), icon: z.union([z.string().regex(/^[a-z0-9-]{2,40}$/, 'Choose an icon from the list'), z.literal('')]).optional(), isActive: z.boolean().optional(), displayOrder: z.number().int().min(0).max(100000).optional(), services: z.array(z.string().trim().min(1).max(150)).max(500).optional() }).strict();
  const servicesBody = z.object({ services: z.array(z.string().trim().min(1).max(150)).min(1).max(500) }).strict();
  router.get('/admin/categories', ...adminOnly, admin.categoryTree());
  router.patch('/admin/categories/:id', ...adminOnly, validate(idParam.extend({ body: categoryUpdateBody })), admin.updateCategory());
  router.delete('/admin/categories/:id', ...adminOnly, requirePassword(), validate(idParam), admin.removeCategory());
  router.post('/admin/categories', ...adminOnly, validate(z.object({ body: categoryBody })), admin.createCategory());
  router.post('/admin/categories/import', ...adminOnly, csvUpload.single('file'), admin.importCategories(false));
  router.post('/admin/categories/:id/subcategories/import', ...adminOnly, validate(idParam), csvUpload.single('file'), admin.importCategories(true));
  router.post('/admin/categories/:id/services', ...adminOnly, validate(idParam.extend({ body: servicesBody })), admin.addServices());
  router.post('/admin/categories/:id/services/import', ...adminOnly, validate(idParam), csvUpload.single('file'), admin.importServices());
  router.get('/admin/owners', ...adminOnly, admin.owners());
  router.get('/admin/businesses', ...adminOnly, validate(z.object({ query: pagination.extend({ status: z.enum(['draft', 'pending_review', 'published', 'suspended', 'rejected']).optional() }) })), admin.businesses());
  router.use('/admin', adminWriteLimit, auditAdmin(mailer));
  const peopleQuery = { page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25), search: z.string().trim().max(100).optional() };
  router.get('/admin/stats', ...adminOnly, people.stats());
  router.get('/admin/activity', ...adminOnly, validate(z.object({ query: z.object({ ...peopleQuery, type: z.enum(['business', 'user', 'category', 'review', 'report', 'claim', 'other']).optional() }) })), ops.listActivity());
  router.post('/admin/users', ...adminOnly, requirePassword((req) => req.body?.role === 'admin'), validate(z.object({ body: z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(254), role: z.enum(['customer', 'business_owner', 'admin']) }).strict() })), ops.createUser(config, mailer));
  router.patch('/admin/users/:id/role', ...adminOnly, requirePassword(), validate(idParam.extend({ body: z.object({ role: z.enum(['customer', 'business_owner', 'admin']) }).strict() })), ops.changeRole());
  router.get('/admin/reports', ...adminOnly, validate(z.object({ query: z.object({ ...peopleQuery, status: z.enum(['open', 'dismissed', 'removed', 'all']).optional() }) })), ops.listReports());
  router.patch('/admin/reports/:id', ...adminOnly, validate(idParam.extend({ body: z.object({ action: z.enum(['dismiss', 'remove']), note: z.string().trim().max(600).optional() }).strict() })), ops.resolveReport());
  router.get('/admin/claims', ...adminOnly, validate(z.object({ query: z.object({ ...peopleQuery, status: z.enum(['pending', 'approved', 'rejected', 'all']).optional() }) })), ops.listClaims());
  router.patch('/admin/claims/:id', ...adminOnly, requirePassword((req) => req.body?.decision === 'approve'), validate(idParam.extend({ body: z.object({ decision: z.enum(['approve', 'reject']), note: z.string().trim().max(600).optional() }).strict() })), ops.decideClaim(config, mailer));
  router.get('/admin/export/businesses', ...adminOnly, ops.exportBusinesses());
  router.get('/admin/export/users', ...adminOnly, ops.exportUsers());
  router.post('/businesses/:id/reviews/:reviewId/report', reviewLimit, authenticate(config), validate(z.object({ params: z.object({ id: objectId, reviewId: objectId }), body: z.object({ reason: z.enum(['spam', 'fake', 'abusive', 'irrelevant', 'personal_info', 'other']), note: z.string().trim().max(600).optional() }).strict() })), ops.reportReview());
  router.post('/businesses/:id/claims', reviewLimit, authenticate(config), validate(idParam.extend({ body: z.object({ relationship: z.enum(['owner', 'manager', 'employee', 'agency', 'other']).default('owner'), phone: z.string().trim().regex(/^[0-9+\-\s]{7,20}$/, 'Enter a valid phone number'), message: z.string().trim().min(10).max(1500), documentUrl: httpUrl.optional() }).strict() })), ops.createClaim());
  router.get('/owner/claims', ...ownerOnly, ops.myClaims());
  router.get('/admin/users', ...adminOnly, validate(z.object({ query: z.object({ ...peopleQuery, role: z.enum(['customer', 'business_owner', 'admin', 'super_admin']).optional(), status: z.enum(['active', 'suspended']).optional() }) })), people.listUsers());
  router.get('/admin/users/:id', ...adminOnly, validate(idParam), people.userDetail());
  router.patch('/admin/users/:id/status', ...adminOnly, requirePassword((req) => req.body?.status === 'suspended'), validate(idParam.extend({ body: z.object({ status: z.enum(['active', 'suspended']) }).strict() })), people.setUserStatus());
  router.get('/admin/reviews', ...adminOnly, validate(z.object({ query: z.object({ ...peopleQuery, rating: z.coerce.number().int().min(1).max(5).optional(), replied: z.enum(['yes', 'no']).optional() }) })), people.listReviews());
  router.get('/admin/leads', ...adminOnly, validate(z.object({ query: z.object({ ...peopleQuery, status: z.enum(['new', 'contacted', 'converted']).optional() }) })), people.listLeads());
  const listingAction = z.enum(['suspend', 'restore', 'delete']);
  const bulkAction = z.enum(['suspend', 'restore', 'delete', 'assign']);
  router.post('/admin/users/:id/listings', ...adminOnly, requirePassword((req) => req.body?.action === 'delete'), validate(idParam.extend({ body: z.object({ action: listingAction }).strict() })), people.ownerListingsAction());
  router.post('/admin/businesses/bulk', ...adminOnly, requirePassword((req) => ['delete', 'assign'].includes(req.body?.action)), validate(z.object({ body: z.object({ ids: z.array(objectId).min(1).max(300), action: bulkAction, ownerId: objectId.optional() }).strict().refine((value) => value.action !== 'assign' || Boolean(value.ownerId), { message: 'Choose the owner to assign to', path: ['ownerId'] }) })), people.bulkListingsAction());
  router.get('/admin/businesses/:id', ...adminOnly, validate(idParam), admin.businessById());
  router.patch('/admin/businesses/:id', ...adminOnly, validate(idParam.extend({ body: ownerBusinessUpdateBody })), admin.updateBusiness());
  router.patch('/admin/businesses/:id/status', ...adminOnly, validate(idParam.extend({ body: z.object({ status: z.enum(['published', 'suspended']) }).strict() })), admin.setBusinessStatus(config, mailer));
  router.delete('/admin/businesses/:id', ...adminOnly, requirePassword(), validate(idParam), admin.removeBusiness());
  router.post('/admin/businesses/import', ...adminOnly, csvUpload.single('file'), admin.importBusinesses());
  router.patch('/admin/businesses/:id/owner', ...adminOnly, requirePassword(), validate(idParam.extend({ body: z.object({ ownerId: objectId }).strict() })), admin.assignBusinessOwner());
  router.post('/admin/businesses', ...adminOnly, validate(z.object({ body: ownerBusinessBody.extend({ email: z.union([z.string().email(), z.literal('')]).optional(), ownerId: objectId.optional(), publish: z.boolean().optional() }) })), admin.createBusiness());
  router.delete('/admin/businesses/:id/reviews/:reviewId', ...adminOnly, validate(z.object({ params: z.object({ id: objectId, reviewId: objectId }) })), reviews.deleteReview());
  router.patch('/admin/businesses/:id/kyc', ...adminOnly, validate(idParam.extend({ body: z.object({ decision: z.enum(['approve', 'reject']), reason: z.string().trim().max(500).optional() }).strict() })), admin.reviewKyc(config, mailer));
  router.patch('/admin/businesses/:id/plan', ...adminOnly, validate(idParam.extend({ body: z.object({ plan: z.enum(['free', 'premium']), planExpiresAt: z.coerce.date().optional() }).strict() })), admin.setPlan());
  router.patch('/admin/businesses/:id/review', ...adminOnly, validate(idParam.extend({ body: z.object({ decision: z.enum(['approve', 'reject']), rejectionReason: z.string().trim().max(2000).optional() }).strict() })), admin.reviewBusiness(config, mailer));
  router.patch('/admin/businesses/:id/google-place', ...adminOnly, validate(idParam), admin.clearGooglePlaceMismatch());
  router.patch('/admin/businesses/:id/google-business-profile', ...adminOnly, validate(idParam), gbp.adminUnlink());
const publicQuery=pageQuery.extend({q:z.string().trim().max(100).optional(),category:z.string().trim().max(180).optional(),city:z.string().trim().max(120).optional(),locality:z.string().trim().max(120).optional(),state:z.string().trim().max(120).optional(),verified:z.enum(['true','false']).optional(),minimumRating:z.coerce.number().min(0).max(5).optional(),amenity:z.string().trim().max(400).optional(),hasPhotos:z.enum(['true']).optional(),hasWebsite:z.enum(['true']).optional(),lat:z.coerce.number().min(-90).max(90).optional(),lng:z.coerce.number().min(-180).max(180).optional(),radiusMeters:z.coerce.number().int().min(100).max(50000).default(10000),openNow:z.enum(['true','false']).optional(),sort:z.enum(['relevance','rating','newest','distance']).default('relevance')}).refine(q=>(q.lat===undefined)===(q.lng===undefined),{message:'Latitude and longitude must be provided together',path:['lat']});
const businessLeadBody = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30).regex(/^[+()\d\s-]+$/).refine(value => {
    const digits = value.replace(/\D/g, '').length;
    return digits >= 7 && digits <= 15;
  }, 'Enter a valid phone number'),
  email: z.union([z.email().max(254), z.literal('')]).optional(),
  service: z.string().trim().max(150).optional(),
  message: z.string().trim().min(5).max(2000),
}).strict();
router.get('/offers', validate(z.object({ query: z.object({ city: z.string().trim().max(120).optional(), occasion: z.string().trim().max(40).optional(), limit: z.coerce.number().int().min(1).max(60).default(24) }) })), directory.offersList());
router.get('/businesses/facets', validate(z.object({ query: z.object({ city: z.string().trim().max(120).optional(), category: z.string().trim().max(180).optional(), q: z.string().trim().max(100).optional() }) })), directory.businessFacets());
router.get('/businesses', validate(z.object({query:publicQuery})), directory.businessList());
router.get('/search', validate(z.object({query:publicQuery})), directory.businessList());
router.get('/businesses/:slug', directory.businessBySlug());
router.post('/businesses/:id/views', softAuthenticate(config), businessViewLimit, validate(idParam), directory.recordBusinessView());
router.post('/businesses/:id/leads', businessLeadLimit, validate(idParam.extend({ body: businessLeadBody })), directory.createBusinessLead(config, mailer));
router.post('/businesses/:id/events', softAuthenticate(config), businessEventLimit, validate(idParam.extend({ body: z.object({ type: z.enum(['call', 'whatsapp', 'directions', 'website']) }).strict() })), directory.recordBusinessEvent());
router.get('/businesses/:id/google-reviews', googleReviewsLimit, createGoogleReviewsController(places, googleBusinessProfile));
  return router;
}
