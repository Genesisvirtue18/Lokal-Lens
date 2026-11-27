import mongoose from 'mongoose';
import { emailField, phoneField, slugField, urlField } from './fields.js';

const { Schema } = mongoose;
// Edits to an approved listing wait here for an admin. Hidden by default (select: false) so a public response can never carry unapproved text.
const pendingChangesSchema = new Schema({ data: { type: Schema.Types.Mixed }, fields: { type: [String], default: undefined }, submittedAt: Date, status: { type: String, enum: ['pending', 'rejected'] }, rejectionReason: { type: String, maxlength: 500 } }, { _id: false });
const addressSchema = new Schema({
  addressLine1: { type: String, trim: true, maxlength: 250 },
  addressLine2: { type: String, trim: true, maxlength: 250 },
  landmark: { type: String, trim: true, maxlength: 150 },
  locality: { type: String, trim: true, maxlength: 120 },
  city: { type: String, trim: true, maxlength: 120 },
  state: { type: String, trim: true, maxlength: 120 },
  postalCode: { type: String, trim: true, maxlength: 20 },
  country: { type: String, trim: true, uppercase: true, match: /^[A-Z]{2}$/ },
}, { _id: false });

const locationSchema = new Schema({
  type: { type: String, enum: ['Point'], default: 'Point', required: true },
  coordinates: { type: [Number], default: undefined, required: true, validate: {
    validator: value => Array.isArray(value) && value.length === 2 && value.every(Number.isFinite)
      && value[0] >= -180 && value[0] <= 180 && value[1] >= -90 && value[1] <= 90,
    message: 'Coordinates must be [longitude, latitude] within valid ranges',
  } },
}, { _id: false });

const hoursSchema = new Schema({
  day: { type: String, required: true, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
  isClosed: { type: Boolean, default: false },
  is24Hours: { type: Boolean, default: false },
  breakStart: { type: String, match: /^(?:[01]\d|2[0-3]):[0-5]\d$/ },
  breakEnd: { type: String, match: /^(?:[01]\d|2[0-3]):[0-5]\d$/ },
  opens: { type: String, match: /^(?:[01]\d|2[0-3]):[0-5]\d$/, required() { return !this.isClosed && !this.is24Hours; } },
  closes: { type: String, match: /^(?:[01]\d|2[0-3]):[0-5]\d$/, required() { return !this.isClosed && !this.is24Hours; } },
}, { _id: false });

const reviewSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewerName: { type: String, required: true, trim: true, maxlength: 120 },
  reviewerAvatar: urlField,
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 3000 },
  isVerified: { type: Boolean, default: false },
  reply: { type: new Schema({ text: { type: String, trim: true, required: true, maxlength: 1000 }, createdAt: { type: Date, default: Date.now } }, { _id: false }), default: undefined },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const testimonialSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  quote: { type: String, required: true, trim: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const socialLinksSchema = new Schema({
  facebook: urlField,
  instagram: urlField,
  linkedin: urlField,
  youtube: urlField,
  x: urlField,
}, { _id: false });

const faqSchema = new Schema({
  question: { type: String, required: true, trim: true, maxlength: 500 },
  answer: { type: String, required: true, trim: true, maxlength: 3000 },
}, { _id: true });

const offerSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, trim: true, maxlength: 2000 },
  code: { type: String, trim: true, uppercase: true, maxlength: 50 },
  occasion: { type: String, trim: true, maxlength: 40 },
  // How to use the offer, in the owner's words: "Show this code at the shop", "Use the code when you order online"...
  howToAvail: { type: String, trim: true, maxlength: 160 },
  validFrom: Date,
  validUntil: Date,
  isActive: { type: Boolean, default: true },
}, { _id: true });
const kycDocumentSchema = new Schema({
  type: { type: String, required: true, enum: ['gst_certificate', 'msme_certificate', 'shop_license', 'pan_card', 'aadhaar', 'other'] },
  url: { ...urlField, required: true },
  status: { type: String, enum: ['submitted', 'approved', 'rejected'], default: 'submitted' },
  submittedAt: { type: Date, default: Date.now },
}, { _id: true });
const contactPersonSchema = new Schema({
  name: { type: String, trim: true, maxlength: 120 },
  designation: { type: String, trim: true, maxlength: 120 },
}, { _id: false });
const counter = { type: Number, default: 0, min: 0, validate: Number.isInteger };

const businessSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true, trim: true, maxlength: 180 },
  slug: slugField,
  description: { type: String, trim: true, maxlength: 10000 },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  subcategories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
  secondaryCategories: { type: [{ type: Schema.Types.ObjectId, ref: 'Category' }], validate: { validator: value => value.length <= 9, message: 'Choose at most 9 additional categories' } },
  services: [{ type: String, trim: true, maxlength: 150 }],
  phone: phoneField,
  alternatePhone: phoneField,
  whatsapp: phoneField,
  email: emailField,
  website: urlField,
  googlePlaceId: { type: String, trim: true, maxlength: 300, match: /^[A-Za-z0-9_-]{1,300}$/ },
  googlePlaceVerificationStatus: { type: String, enum: ['unverified', 'verified', 'mismatch'], default: 'unverified' },
  googleBusinessProfileLocation: { type: String, trim: true, maxlength: 300 },
  googleBusinessProfileTitle: { type: String, trim: true, maxlength: 180 },
  googleBusinessProfileLinkedAt: Date,
  address: addressSchema,
  location: { type: locationSchema, default: undefined },
  locationApproximate: { type: Boolean, default: false },
  workingHours: { type: [hoursSchema], validate: {
    validator: value => new Set(value.map(entry => entry.day)).size === value.length,
    message: 'Each working day must appear only once',
  } },
  serviceItems: [{ _id: false, name: { type: String, trim: true, required: true, maxlength: 150 }, description: { type: String, trim: true, maxlength: 300 }, priceFrom: { type: Number, min: 0 }, priceTo: { type: Number, min: 0 }, unit: { type: String, trim: true, maxlength: 30 } }],
  serviceMode: { type: String, enum: ['visit', 'travel', 'both'], default: 'visit' },
  specialHours: [{ _id: false, label: { type: String, trim: true, required: true, maxlength: 120 }, date: { type: String, trim: true, maxlength: 20 }, isClosed: { type: Boolean, default: true }, opens: String, closes: String }],
  tagline: { type: String, trim: true, maxlength: 160 },
  legalName: { type: String, trim: true, maxlength: 180 },
  businessType: { type: String, enum: ['shop', 'service_provider', 'restaurant', 'manufacturer', 'wholesaler', 'online', 'clinic', 'institute', 'other'] },
  contactPerson: contactPersonSchema,
  landline: { type: String, trim: true, maxlength: 20, match: /^[0-9+\-\s()]{6,20}$/ },
  tollFree: { type: String, trim: true, maxlength: 20, match: /^[0-9+\-\s()]{6,20}$/ },
  gstNumber: { type: String, trim: true, uppercase: true, match: /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/ },
  msmeNumber: { type: String, trim: true, uppercase: true, maxlength: 30 },
  kycDocuments: { type: [kycDocumentSchema], default: [] },
  kycStatus: { type: String, enum: ['not_submitted', 'submitted', 'verified', 'rejected'], default: 'not_submitted' },
  kycRejectionReason: { type: String, maxlength: 500 },
  paymentModes: [{ type: String, enum: ['cash', 'upi', 'debit_card', 'credit_card', 'net_banking', 'cheque', 'emi', 'wallet'] }],
  serviceAreas: [{ type: String, trim: true, maxlength: 120 }],
  languages: [{ type: String, trim: true, maxlength: 40 }],
  homeDelivery: { type: Boolean, default: false },
  videoUrl: urlField,
  brochureUrl: urlField,
  plan: { type: String, enum: ['free', 'premium'], default: 'free' },
  planExpiresAt: Date,
  logo: urlField,
  images: [urlField],
  photoCount: { type: Number, default: 0, min: 0, validate: Number.isInteger },
  priceRange: { type: String, enum: ['budget', 'moderate', 'expensive', 'luxury'] },
  keywords: [{ type: String, trim: true, maxlength: 80 }],
  highlights: [{ type: String, trim: true, maxlength: 180 }],
  amenities: [{ type: String, trim: true, maxlength: 180 }],
  establishedYear: { type: Number, min: 1800, max: new Date().getFullYear(), validate: Number.isInteger },
  teamSize: { type: Number, min: 1, validate: Number.isInteger },
  responseTimeMinutes: { type: Number, min: 0, validate: Number.isInteger },
  mapEmbedUrl: urlField,
  socialLinks: socialLinksSchema,
  faqs: [faqSchema],
  offers: [offerSchema],
  reviews: [reviewSchema],
  testimonials: { type: [testimonialSchema], default: [] },
  rejectionReason: { type: String, maxlength: 2000 },
  // Set when a live listing goes back to review because the owner changed something sensitive (name, phone, category, city).
  reviewNote: { type: String, maxlength: 400 },
  pendingChanges: { type: pendingChangesSchema, select: false },
  timeZone: { type: String, default: 'Asia/Kolkata' },
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  listingStatus: { type: String, enum: ['draft', 'pending_review', 'published', 'paused', 'suspended', 'rejected', 'deleted'], default: 'draft' },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: counter,
  viewCount: counter,
  isFeatured: { type: Boolean, default: false },
  contactClickCount: counter,
  leadCount: counter,
  featuredUntil: Date,
  subscription: { type: Schema.Types.ObjectId, ref: 'Subscription' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

businessSchema.index({ location: '2dsphere' });
businessSchema.index({ category: 1 });
businessSchema.index({ secondaryCategories: 1 });
businessSchema.index({ category: 1, listingStatus: 1, deletedAt: 1, averageRating: -1 }, { collation: { locale: 'en', strength: 2 } });
businessSchema.index({ 'address.city': 1, 'address.locality': 1 });
businessSchema.index({ 'address.locality': 1 });
businessSchema.index({ listingStatus: 1 });
businessSchema.index({ listingStatus: 1, deletedAt: 1, createdAt: -1 }, { collation: { locale: 'en', strength: 2 } });
businessSchema.index({ listingStatus: 1, deletedAt: 1, isFeatured: -1, averageRating: -1, _id: 1 }, { collation: { locale: 'en', strength: 2 } });
businessSchema.index({ listingStatus: 1, deletedAt: 1, averageRating: -1, reviewCount: -1, _id: 1 }, { collation: { locale: 'en', strength: 2 } });
businessSchema.index({ listingStatus: 1, deletedAt: 1, 'address.city': 1, 'address.locality': 1, verificationStatus: 1, averageRating: -1 });
businessSchema.index({ listingStatus: 1, deletedAt: 1, 'address.city': 1, 'address.locality': 1, 'address.state': 1, verificationStatus: 1, averageRating: -1 }, { collation: { locale: 'en', strength: 2 } });
businessSchema.index({ owner: 1, deletedAt: 1 });
businessSchema.index({ name: 'text', description: 'text', keywords: 'text', services: 'text' });
businessSchema.pre('validate', function standardizeEmbeddedData() {
  // Owners submitting documents (or changing a verified GST number) puts the KYC back in the admin queue.
  if (this.kycDocuments?.length && ['not_submitted', 'rejected'].includes(this.kycStatus) && (this.kycStatus === 'not_submitted' || this.isModified('kycDocuments') || this.isModified('gstNumber'))) { this.kycStatus = 'submitted'; this.kycRejectionReason = undefined; }
  if (this.kycStatus === 'verified' && !this.isNew && this.isModified('gstNumber')) this.kycStatus = 'submitted';
  if (this.isModified('reviews')) {
    const ratings = this.reviews.map(review => Number(review.rating)).filter(rating => Number.isFinite(rating) && rating >= 1 && rating <= 5);
    this.reviewCount = ratings.length;
    this.averageRating = ratings.length ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(2)) : 0;
  }
  if (this.isModified('images')) this.photoCount = this.images.length;
});

export const Business = mongoose.model('Business', businessSchema);
