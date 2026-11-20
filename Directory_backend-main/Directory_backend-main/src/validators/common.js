import { z } from 'zod';
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier');
export const pagination = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });
export const accountRole = z.enum(['customer', 'business_owner']).default('customer');
// Spaces and dashes are fine while typing ("98765 43210", "+91 98765-43210"); they are removed before checking.
export const indianPhone = z.string().trim().transform(value => value.replace(/[\s-]/g, '')).pipe(z.string().regex(/^(?:\+?91)?[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'));
// An email typed or pasted with spaces or CAPITALS is the same email; anything longer than 254 characters can't be one.
// A new password needs a letter, a number and a special character (signing in is never blocked by this, so older accounts keep working).
export const strongPassword = z.string().min(8, 'Password must be at least 8 characters').max(128).refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value), 'Use at least one letter, one number and one special character, like ! @ # or -');
export const emailInput = z.string().trim().toLowerCase().max(254).email();
export const authRegister = z.object({ body: z.object({ name: z.string().trim().min(2).max(120).optional(), email: emailInput, password: strongPassword, role: accountRole, phone: indianPhone.optional() }).strict() });
export const authLogin = z.object({ body: z.object({ email: emailInput, password: z.string().min(1).max(128) }) });
export const refreshSchema = z.object({ body: z.object({}).passthrough().optional() });
export const idParam = z.object({ params: z.object({ id: objectId }) });
