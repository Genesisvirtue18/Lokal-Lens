import { hashRecoveryCode, openSecret, verifyTotp } from './totp.js';

// Checks a 6-digit authenticator code (each code works once) or a backup code (used up when accepted).
// Wrong tries count towards a short lock, the same as wrong passwords. `user` must have totpSecretEnc, totpLastStep, totpRecovery,
// failedLogins and lockedUntil loaded.
export async function checkSecondFactor(user, rawCode, config) {
  const code = String(rawCode || '').trim();
  let ok = false;
  if (/^\d{6}$/.test(code) && user.totpSecretEnc) {
    const step = verifyTotp(openSecret(config, user.totpSecretEnc), code, user.totpLastStep || 0);
    if (step !== null) { user.totpLastStep = step; ok = true; }
  } else if (code) {
    const hash = hashRecoveryCode(code);
    const index = (user.totpRecovery || []).indexOf(hash);
    if (index >= 0) { user.totpRecovery.splice(index, 1); ok = true; }
  }
  if (ok) { user.failedLogins = 0; user.lockedUntil = undefined; }
  else { user.failedLogins = (user.failedLogins || 0) + 1; if (user.failedLogins >= 8) { user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); user.failedLogins = 0; } }
  await user.save().catch(() => {});
  return ok;
}
