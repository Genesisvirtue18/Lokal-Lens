import mongoose from 'mongoose';

// One row per admin change: who did what, to which listing / account / category, and when.
const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  actorName: { type: String, maxlength: 120 },
  actorEmail: { type: String, maxlength: 254 },
  label: { type: String, required: true, maxlength: 200 },
  method: { type: String, maxlength: 10 },
  route: { type: String, maxlength: 200 },
  targetType: { type: String, enum: ['business', 'user', 'category', 'review', 'report', 'claim', 'other'], default: 'other' },
  targetId: { type: String, maxlength: 40 },
  targetName: { type: String, maxlength: 200 },
  details: { type: String, maxlength: 600 },
}, { timestamps: { createdAt: true, updatedAt: false } });
auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
