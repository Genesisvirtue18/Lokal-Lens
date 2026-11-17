import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  refreshToken: { type: String, required: true, select: false },
  accessToken: { type: String, required: true, select: false },
  accessTokenExpiresAt: { type: Date, required: true },
  googleAccountEmail: { type: String, trim: true, lowercase: true },
  connectedAt: { type: Date, default: Date.now },
}, { timestamps: true, collection: 'googlebusinessownerconnections' });

export const GoogleBusinessConnection = mongoose.model('GoogleBusinessConnection', schema);
