import crypto from 'node:crypto';
import { AuditLog } from '../models/AuditLog.js';
import { Business } from '../models/Business.js';
import { ClaimCode } from '../models/ClaimCode.js';
import { ListingClaim } from '../models/ListingClaim.js';
import { User } from '../models/User.js';
import { dashboardUrl, emailPerson } from '../services/notices.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';

// ---- How a listing is claimed ---------------------------------------------------------------------------------------------
// 1. A listing that has no real owner yet (added by our team) is handed over at once when the claimant proves a connection:
//    a 6-digit code sent to the email shown on the listing, or an email address on the business's own website domain.
// 2. A listing that already belongs to an owner is never handed over automatically. The current owner is told by email and can
//    dispute the claim; our team decides with that in front of them.
// 3. Anything without proof waits for our team to check the document and message.

const CODE_MINUTES = 10;
const MAX_CODE_TRIES = 5;
const MAX_OPEN_CLAIMS = 5;
const FREE_MAIL = new Set(['gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.in', 'ymail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com', 'rediffmail.com', 'zoho.com', 'mail.com', 'gmx.com']);

const codeHash = (config, businessId, userId, code) => crypto.createHmac('sha256', config.JWT_ACCESS_SECRET || 'dev').update(`${businessId}:${userId}:${code}`).digest('hex');
const safeEqual = (a, b) => { const x = Buffer.from(a, 'hex'); const y = Buffer.from(b, 'hex'); return x.length === y.length && crypto.timingSafeEqual(x, y); };
export const maskEmail = (email = '') => { const [name = '', domain = ''] = String(email).split('@'); return `${name.slice(0, 1)}${'•'.repeat(Math.max(2, Math.min(6, name.length - 1)))}@${domain}`; };
const hostOf = (url = '') => { try { return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./i, '').toLowerCase(); } catch { return ''; } };
const domainOf = (email = '') => String(email).split('@')[1]?.toLowerCase() || '';

const loadClaimable = async (id) => {
  const business = await Business.findOne({ _id: id, deletedAt: null, listingStatus: 'published' }).select('name owner email website').populate('owner', 'name email platformManaged notificationPreferences');
  if (!business) throw new AppError('Business not found', 404);
  return business;
};
const isPlaceholderOwner = (business) => !business.owner || business.owner.platformManaged === true;

// Tells the page which proofs are possible for this listing, without revealing the address itself.
export const claimOptions = () => async (req, res, next) => { try {
  const business = await loadClaimable(req.params.id);
  const sameDomain = business.website && !FREE_MAIL.has(hostOf(business.website)) && domainOf(req.user.email) === hostOf(business.website) && req.user.emailVerified;
  sendSuccess(res, 'Claim options', {
    emailCode: Boolean(business.email),
    maskedEmail: business.email ? maskEmail(business.email) : undefined,
    domainMatch: Boolean(sameDomain),
    instant: isPlaceholderOwner(business),
    alreadyYours: Boolean(business.owner && String(business.owner._id) === String(req.user.id)),
  });
} catch (error) { next(error); } };

export const sendClaimCode = (config, mailer) => async (req, res, next) => { try {
  const business = await loadClaimable(req.params.id);
  if (business.owner && String(business.owner._id) === String(req.user.id)) throw new AppError('This listing is already yours', 409);
  if (!business.email) throw new AppError('This listing has no email address to send a code to. Send your claim with a document instead.', 422);
  const existing = await ClaimCode.findOne({ business: business._id, user: req.user.id });
  if (existing && Date.now() - existing.createdAt.getTime() < 60 * 1000) throw new AppError('Please wait a minute before asking for another code.', 429);
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await ClaimCode.findOneAndUpdate({ business: business._id, user: req.user.id }, { codeHash: codeHash(config, business._id, req.user.id, code), attempts: 0, expiresAt: new Date(Date.now() + CODE_MINUTES * 60 * 1000), createdAt: new Date() }, { upsert: true, setDefaultsOnInsert: true });
  if (mailer) { try { await mailer.send({ to: business.email, subject: `${code} is your code to claim ${business.name}`, text: `Someone asked to claim “${business.name}” on Lokal Lens.\n\nIf that was you, enter this code: ${code}\n\nIt expires in ${CODE_MINUTES} minutes. If you don’t know about this, ignore this email. Nothing changes unless the code is used.` }); } catch { console.error('Claim code email could not be sent'); } }
  const dev = !config.SMTP_HOST && config.NODE_ENV !== 'production';
  sendSuccess(res, `We sent a 6-digit code to ${maskEmail(business.email)}.`, { maskedEmail: maskEmail(business.email), expiresInMinutes: CODE_MINUTES, ...(dev ? { devCode: code } : {}) });
} catch (error) { next(error); } };

async function checkClaimCode(config, business, user, code) {
  const row = await ClaimCode.findOne({ business: business._id, user: user.id });
  if (!row || row.expiresAt <= new Date()) throw new AppError('That code has expired. Ask for a new one.', 400);
  if (row.attempts >= MAX_CODE_TRIES) throw new AppError('Too many wrong codes. Ask for a new one.', 429);
  if (!safeEqual(row.codeHash, codeHash(config, business._id, user.id, code))) { row.attempts += 1; await row.save(); throw new AppError('That code isn’t right. Check it and try again.', 400); }
  await row.deleteOne();
}

const logAuto = (actor, business, details) => AuditLog.create({ actor: actor._id, actorName: actor.name, actorEmail: actor.email, label: 'Claim approved automatically', method: 'POST', route: `/businesses/${business._id}/claims`, targetType: 'claim', targetId: String(business._id), targetName: business.name, details }).catch(() => {});

export const createClaim = (config, mailer) => async (req, res, next) => { try {
  const business = await loadClaimable(req.params.id);
  const { relationship, phone, message, documentUrl, emailCode } = req.validated.body;
  if (business.owner && String(business.owner._id) === String(req.user.id)) throw new AppError('This listing is already yours', 409);
  if (await ListingClaim.exists({ business: business._id, claimant: req.user.id, status: 'pending' })) throw new AppError('You already sent a claim for this listing. We’ll email you once it is checked.', 409);
  if (await ListingClaim.countDocuments({ claimant: req.user.id, status: 'pending' }) >= MAX_OPEN_CLAIMS) throw new AppError(`You have ${MAX_OPEN_CLAIMS} claims waiting already. Wait for them to be checked first.`, 429);
  if (await ListingClaim.exists({ business: business._id, claimant: req.user.id, status: 'rejected', createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } })) throw new AppError('Your last claim for this listing was declined. Please wait a day before sending another.', 429);

  let verifiedVia = 'none';
  if (emailCode) { await checkClaimCode(config, business, req.user, emailCode); verifiedVia = 'listing_email'; }
  else if (business.website && req.user.emailVerified && !FREE_MAIL.has(hostOf(business.website)) && domainOf(req.user.email) === hostOf(business.website)) verifiedVia = 'website_domain';
  if (verifiedVia === 'none' && !documentUrl && relationship !== 'owner') throw new AppError('Add a document, or verify with the email code, so we can check your claim.', 422);

  const previous = business.owner || undefined;
  const claim = await ListingClaim.create({ business: business._id, claimant: req.user.id, relationship, phone, message, verifiedVia, ...(documentUrl ? { documentUrl } : {}), ...(previous ? { previousOwner: previous._id } : {}) });

  // Proven connection + nobody real owns it yet: hand it over now.
  if (verifiedVia !== 'none' && isPlaceholderOwner(business)) {
    const claimant = await User.findById(req.user.id);
    if (claimant.role === 'customer') claimant.role = 'business_owner';
    await claimant.save();
    await Business.updateOne({ _id: business._id }, { $set: { owner: claimant._id } });
    claim.status = 'approved'; claim.autoApproved = true; claim.decidedAt = new Date(); claim.decisionNote = verifiedVia === 'listing_email' ? 'Verified with a code sent to the listing’s email.' : 'Verified with an email on the business’s own domain.';
    await claim.save();
    await ListingClaim.updateMany({ business: business._id, status: 'pending', _id: { $ne: claim._id } }, { $set: { status: 'rejected', decisionNote: 'Another claim for this listing was approved.', decidedAt: new Date() } });
    logAuto(claimant, business, claim.decisionNote);
    emailPerson(mailer, claimant, `You now manage ${business.name} on Lokal Lens`, [`Your claim for “${business.name}” was verified.`, '', `Manage the listing here: ${dashboardUrl(config)}`]);
    return sendSuccess(res, `Verified. “${business.name}” is now in your account.`, { item: { _id: claim._id, status: 'approved', instant: true } }, 201);
  }

  // Someone real already owns it: tell them, so a false claim can't succeed quietly.
  if (previous && !isPlaceholderOwner(business)) {
    claim.ownerNotifiedAt = new Date(); await claim.save();
    emailPerson(mailer, previous, `Someone asked to claim “${business.name}”`, [`A claim was sent for “${business.name}”, which is in your Lokal Lens account.`, '', 'If this is a mistake, open your dashboard and tell us it’s not them. Our team won’t move the listing without checking.', dashboardUrl(config)]);
  }
  sendSuccess(res, 'Claim sent. Our team will check it and email you.', { item: { _id: claim._id, status: claim.status, verifiedVia } }, 201);
} catch (error) { next(error); } };

// ---- For the current owner: claims against their listings ----------------------------------------------------------------
export const incomingClaims = () => async (req, res, next) => { try {
  const mine = await Business.find({ owner: req.user.id, deletedAt: null }).select('_id').lean();
  const items = await ListingClaim.find({ business: { $in: mine.map((b) => b._id) }, status: 'pending' }).populate('business', 'name').populate('claimant', 'name').sort('-createdAt').limit(20).lean();
  // The claimant's contact details stay private; the owner only needs to know it happened and to say "not them".
  sendSuccess(res, 'Claims retrieved', { items: items.map((c) => ({ _id: c._id, businessId: c.business?._id, businessName: c.business?.name, claimantName: c.claimant?.name, relationship: c.relationship, verifiedVia: c.verifiedVia, createdAt: c.createdAt, disputed: Boolean(c.ownerDispute) })) });
} catch (error) { next(error); } };

export const disputeClaim = () => async (req, res, next) => { try {
  const claim = await ListingClaim.findById(req.params.id);
  const business = claim && await Business.findOne({ _id: claim.business, owner: req.user.id, deletedAt: null }).select('_id');
  if (!claim || !business) throw new AppError('Claim not found', 404);
  if (claim.status !== 'pending') throw new AppError('This claim was already decided', 409);
  claim.ownerDispute = req.validated.body.note; claim.ownerDisputedAt = new Date(); await claim.save();
  sendSuccess(res, 'Thanks. Our team will see your note before deciding.', {});
} catch (error) { next(error); } };
