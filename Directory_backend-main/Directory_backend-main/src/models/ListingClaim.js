import mongoose from 'mongoose';
import { urlField } from './fields.js';

// A business owner says "this listing is mine". An admin checks the proof and either hands the listing over or declines.
const listingClaimSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  claimant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  relationship: { type: String, enum: ['owner', 'manager', 'employee', 'agency', 'other'], default: 'owner' },
  phone: { type: String, trim: true, maxlength: 20 },
  message: { type: String, required: true, trim: true, minlength: 10, maxlength: 1500 },
  documentUrl: urlField,
  previousOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // How we know the claimant is connected to the business: an emailed code to the address on the listing, or an email on the business's own website domain.
  verifiedVia: { type: String, enum: ['none', 'listing_email', 'website_domain'], default: 'none' },
  autoApproved: { type: Boolean, default: false },
  ownerNotifiedAt: Date,
  ownerDispute: { type: String, trim: true, maxlength: 800 },
  ownerDisputedAt: Date,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  decisionNote: { type: String, trim: true, maxlength: 600 },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  decidedAt: Date,
}, { timestamps: true });
listingClaimSchema.index({ business: 1, claimant: 1, status: 1 });

export const ListingClaim = mongoose.model('ListingClaim', listingClaimSchema);
