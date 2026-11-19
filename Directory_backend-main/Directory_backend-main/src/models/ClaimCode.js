import mongoose from 'mongoose';

// A 6-digit code emailed to the address on the listing. Whoever can read that inbox has shown they are connected to the business.
const claimCodeSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
claimCodeSchema.index({ business: 1, user: 1 }, { unique: true });
claimCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ClaimCode = mongoose.model('ClaimCode', claimCodeSchema);
