import mongoose from 'mongoose';

// A signed-in person (a customer or the business owner) flagged a review for the admins to look at.
const reviewReportSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  reviewId: { type: mongoose.Schema.Types.ObjectId, required: true },
  snapshot: { reviewerName: String, rating: Number, comment: String },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reporterRole: { type: String, maxlength: 30 },
  reason: { type: String, enum: ['spam', 'fake', 'abusive', 'irrelevant', 'personal_info', 'other'], required: true },
  note: { type: String, trim: true, maxlength: 600 },
  status: { type: String, enum: ['open', 'dismissed', 'removed'], default: 'open', index: true },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
  resolutionNote: { type: String, maxlength: 600 },
}, { timestamps: true });
reviewReportSchema.index({ reviewId: 1, reporter: 1 }, { unique: true });

export const ReviewReport = mongoose.model('ReviewReport', reviewReportSchema);
