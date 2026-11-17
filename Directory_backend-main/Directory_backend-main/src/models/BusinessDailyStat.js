import mongoose from 'mongoose';

// One row per business per day. Counters only, so analytics stay small and no visitor is identified.
const schema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  day: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  views: { type: Number, default: 0 },
  calls: { type: Number, default: 0 },
  whatsapp: { type: Number, default: 0 },
  directions: { type: Number, default: 0 },
  website: { type: Number, default: 0 },
}, { timestamps: false });
schema.index({ business: 1, day: 1 }, { unique: true });

export const BusinessDailyStat = mongoose.model('BusinessDailyStat', schema);
export const EVENT_FIELDS = { call: 'calls', whatsapp: 'whatsapp', directions: 'directions', website: 'website', view: 'views' };
export const dayKey = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
export const bump = (businessId, field) => BusinessDailyStat.updateOne({ business: businessId, day: dayKey() }, { $inc: { [field]: 1 } }, { upsert: true });
