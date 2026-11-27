import mongoose from 'mongoose';
import { emailField, phoneField } from './fields.js';

const leadSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  phone: { ...phoneField, required: true },
  email: emailField,
  service: { type: String, trim: true, maxlength: 150 },
  message: { type: String, required: true, trim: true, minlength: 5, maxlength: 2000 },
  status: { type: String, enum: ['new', 'contacted', 'converted'], default: 'new' },
  // 'quote' = one request the customer sent to several businesses; the copies share a quoteId.
  source: { type: String, enum: ['inquiry', 'quote'], default: 'inquiry' },
  quoteId: { type: mongoose.Schema.Types.ObjectId },
  notes: [{ type: String, trim: true, maxlength: 1000 }],
  // What the owner wrote back. Unlike notes (private to the owner), replies are shown to the customer.
  replies: [new mongoose.Schema({ text: { type: String, required: true, trim: true, maxlength: 1500 }, createdAt: { type: Date, default: Date.now } }, { _id: true })],
  withdrawnAt: Date,
}, { timestamps: true });

leadSchema.index({ business: 1, createdAt: -1 });

export const Lead = mongoose.model('Lead', leadSchema);
