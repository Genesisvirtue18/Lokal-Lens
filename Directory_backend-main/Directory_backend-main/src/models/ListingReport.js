import mongoose from 'mongoose';

// A signed-in visitor says a listing is wrong, closed, a duplicate, or spam. Our team looks at it and acts.
const listingReportSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, enum: ['wrong_info', 'closed', 'duplicate', 'spam', 'other'], required: true },
  note: { type: String, trim: true, maxlength: 600 },
  status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open', index: true },
  action: { type: String, enum: ['none', 'suspended'], default: 'none' },
  decisionNote: { type: String, trim: true, maxlength: 600 },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  decidedAt: Date,
}, { timestamps: true });
// One open report per person per listing.
listingReportSchema.index({ business: 1, reporter: 1, status: 1 });

export const ListingReport = mongoose.model('ListingReport', listingReportSchema);
