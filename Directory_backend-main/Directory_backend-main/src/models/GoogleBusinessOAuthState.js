import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  stateHash: { type: String, required: true, unique: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 },
}, { timestamps: false, collection: 'googlebusinessoauthstatesv2' });

export const GoogleBusinessOAuthState = mongoose.model('GoogleBusinessOAuthState', schema);
