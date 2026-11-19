import mongoose from 'mongoose';
import { emailField, phoneField, urlField } from './fields.js';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  email: { ...emailField, required() { return !this.phone; } },
  phone: { ...phoneField, required() { return !this.email; } },
  // Authentication must generate a hash; this model never hashes or accepts a raw password.
  passwordHash: { type: String, select: false, validate: {
    validator: value => value == null || /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value)
      || /^\$argon2(?:id|i|d)\$v=19\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/.test(value),
    message: 'passwordHash must be a bcrypt or Argon2 encoded hash',
  } },
  avatar: urlField,
  role: { type: String, enum: ['customer', 'business_owner', 'admin', 'super_admin'], default: 'customer' },
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'suspended', 'deleted'], default: 'active' },
  passwordChangedAt: Date,
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpiresAt: { type: Date, select: false },
  otpHash: { type: String, select: false },
  otpExpiresAt: { type: Date, select: false },
  otpAttempts: { type: Number, default: 0, select: false },
  failedLogins: { type: Number, default: 0, select: false },
  // Authenticator-app two-step verification. The secret is stored encrypted; recovery codes only as hashes.
  totpEnabled: { type: Boolean, default: false },
  totpSecretEnc: { type: String, select: false },
  totpPendingEnc: { type: String, select: false },
  totpLastStep: { type: Number, default: 0, select: false },
  totpRecovery: { type: [String], default: [], select: false },
  lockedUntil: { type: Date, select: false },
  otpSentAt: { type: Date, select: false },
  deletedAt: { type: Date, default: null },
  notificationPreferences: { email: { type: Boolean, default: true }, sms: { type: Boolean, default: false } },
  lastLoginAt: Date,
}, {
  timestamps: true,
  toJSON: { transform(doc, ret) { delete ret.passwordHash; delete ret.totpSecretEnc; delete ret.totpPendingEnc; delete ret.totpLastStep; delete ret.totpRecovery; delete ret.passwordResetTokenHash; delete ret.passwordResetExpiresAt; delete ret.otpHash; delete ret.otpExpiresAt; delete ret.otpAttempts; delete ret.otpSentAt; return ret; } },
  toObject: { transform(doc, ret) { delete ret.passwordHash; delete ret.totpSecretEnc; delete ret.totpPendingEnc; delete ret.totpLastStep; delete ret.totpRecovery; delete ret.passwordResetTokenHash; delete ret.passwordResetExpiresAt; delete ret.otpHash; delete ret.otpExpiresAt; delete ret.otpAttempts; delete ret.otpSentAt; return ret; } },
});
userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string' } } });

export const User = mongoose.model('User', userSchema);
