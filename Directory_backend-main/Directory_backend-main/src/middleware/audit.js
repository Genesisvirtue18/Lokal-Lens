import { AuditLog } from '../models/AuditLog.js';
import { Business } from '../models/Business.js';
import { Category } from '../models/Category.js';
import { User } from '../models/User.js';
import { emailPerson } from '../services/notices.js';

const ID = /[a-f0-9]{24}/g;
const pick = (body, keys) => keys.filter((key) => body?.[key] !== undefined && body[key] !== '').map((key) => `${key}: ${Array.isArray(body[key]) ? `${body[key].length} items` : String(body[key]).slice(0, 120)}`).join(' · ');

// [method, path pattern, target type, label(body), detail keys]
const RULES = [
  ['PATCH', /^\/admin\/businesses\/[^/]+\/review$/, 'business', (b) => (b.decision === 'approve' ? 'Approved listing' : 'Rejected listing'), ['rejectionReason']],
  ['PATCH', /^\/admin\/businesses\/[^/]+\/kyc$/, 'business', (b) => (b.decision === 'approve' ? 'Verified business' : 'Rejected verification'), ['reason']],
  ['PATCH', /^\/admin\/businesses\/[^/]+\/status$/, 'business', (b) => (b.status === 'suspended' ? 'Suspended listing' : 'Restored listing'), []],
  ['PATCH', /^\/admin\/businesses\/[^/]+\/owner$/, 'business', () => 'Assigned an owner', []],
  ['PATCH', /^\/admin\/businesses\/[^/]+\/plan$/, 'business', (b) => `Set plan to ${b.plan}`, ['planExpiresAt']],
  ['PATCH', /^\/admin\/businesses\/[^/]+\/google/, 'business', () => 'Changed Google link', []],
  ['DELETE', /^\/admin\/businesses\/[^/]+\/reviews\/[^/]+$/, 'review', () => 'Deleted a review', []],
  ['PATCH', /^\/admin\/businesses\/[^/]+$/, 'business', () => 'Edited listing', []],
  ['DELETE', /^\/admin\/businesses\/[^/]+$/, 'business', () => 'Deleted listing', []],
  ['POST', /^\/admin\/businesses\/bulk$/, 'business', (b) => `Bulk ${b.action} on ${b.ids?.length || 0} listings`, ['ownerId']],
  ['POST', /^\/admin\/businesses\/import$/, 'business', () => 'Imported listings from CSV', []],
  ['POST', /^\/admin\/businesses$/, 'business', () => 'Created a listing', ['publish']],
  ['POST', /^\/admin\/users\/[^/]+\/listings$/, 'user', (b) => `${b.action} all listings of an owner`, []],
  ['PATCH', /^\/admin\/users\/[^/]+\/status$/, 'user', (b) => (b.status === 'suspended' ? 'Suspended account' : 'Reactivated account'), []],
  ['PATCH', /^\/admin\/users\/[^/]+\/role$/, 'user', (b) => `Changed role to ${b.role}`, []],
  ['POST', /^\/admin\/users$/, 'user', (b) => `Created a ${b.role} account`, ['email']],
  ['PATCH', /^\/admin\/reports\/[^/]+$/, 'report', (b) => (b.action === 'remove' ? 'Removed a reported review' : 'Dismissed a review report'), ['note']],
  ['PATCH', /^\/admin\/claims\/[^/]+$/, 'claim', (b) => (b.decision === 'approve' ? 'Approved a claim' : 'Rejected a claim'), ['note']],
  ['POST', /^\/admin\/categories/, 'category', () => 'Added category or services', ['name']],
  ['PATCH', /^\/admin\/categories\/[^/]+$/, 'category', () => 'Edited category', ['name', 'icon', 'isActive']],
  ['DELETE', /^\/admin\/categories\/[^/]+$/, 'category', () => 'Deleted category', []],
];

// Changes that need a second pair of eyes: every super admin gets an email, so a hijacked session can't act unnoticed.
const RISKY = /^(Changed role|Created an? admin|Deleted listing|Bulk delete|Bulk assign|delete all listings|Approved a claim|Suspended account|Deleted category)/i;

const targetName = async (type, id) => {
  if (!id) return '';
  try {
    if (type === 'business' || type === 'review') return (await Business.findById(id).select('name').lean())?.name || '';
    if (type === 'user') return (await User.findById(id).select('name').lean())?.name || '';
    if (type === 'category') return (await Category.findById(id).select('name').lean())?.name || '';
  } catch { /* the name is only a convenience */ }
  return '';
};

// Writes one AuditLog row after every successful admin change. It never slows down or breaks the request itself.
export const auditAdmin = (mailer) => (req, res, next) => {
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) return next();
  res.on('finish', () => {
    if (res.statusCode >= 400 || !req.user) return;
    const path = req.originalUrl.split('?')[0].replace(/^\/api\/v\d+/, '');
    const rule = RULES.find(([method, pattern]) => method === req.method && pattern.test(path));
    const body = req.body || {};
    const id = path.match(ID)?.[0] || '';
    const type = rule?.[2] || 'other';
    void (async () => {
      const name = await targetName(type, id);
      const label = rule ? rule[3](body) : `${req.method} ${path}`;
      await AuditLog.create({ actor: req.user._id || req.user.id, actorName: req.user.name, actorEmail: req.user.email, label, method: req.method, route: path.replace(ID, ':id'), targetType: type, targetId: id, targetName: name, details: rule ? pick(body, rule[4]) : '' });
      if (mailer && RISKY.test(label)) {
        const supers = await User.find({ role: 'super_admin', status: 'active', deletedAt: null }).select('email notificationPreferences').lean();
        for (const person of supers) emailPerson(mailer, { ...person, notificationPreferences: undefined }, `Admin action: ${label}`, [`${req.user.name} (${req.user.email}) did this: ${label}${name ? ` — ${name}` : ''}.`, '', 'If you don’t recognise it, open Admin → Activity and suspend the account.']);
      }
    })().catch(() => {});
  });
  next();
};
