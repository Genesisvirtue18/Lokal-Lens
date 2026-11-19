"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, Briefcase, Eye, EyeOff, Search } from "lucide-react";
import { Button, Field, Logo, cx, fieldClass } from "@/components/ds";
import { saveSession } from "@/dashboard/api";
import { TwoFactorSetup, TwoFactorVerify } from "@/components/TwoFactor";
import GoogleSignIn, { GOOGLE_CLIENT_ID } from "@/components/GoogleSignIn";

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000/api/v1")).replace(/\/$/, "");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^(?:\+?91)?[6-9]\d{9}$/;
const cleanPhone = (value) => value.replace(/[\s-]/g, "");
const ROLES = [
  ["customer", "I’m looking for businesses", "Find places, save favourites, write reviews.", Search],
  ["business_owner", "I own a business", "List it for free and get customer inquiries.", Briefcase],
];

async function call(path, payload) {
  const response = await fetch(`${apiUrl}${path}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.errors?.[0]?.message || body.message || "Something went wrong. Please try again.");
  return body;
}

// Sign in / Create account. Figma "Desktop / Sign in" and "Create account — Validation error".
// Default method is a one-time code sent to the email address; password sign-in stays available for existing accounts.
function RoleChoice({ value, onChange }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-display text-[14px] font-medium leading-5">How will you use Lokal Lens?</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {ROLES.map(([id, title, hint, Icon]) => (
          <label key={id} className={cx("flex cursor-pointer flex-col gap-1.5 rounded-[12px] border bg-white p-3.5 transition-colors focus-within:ring-2 focus-within:ring-[#002fa7] focus-within:ring-offset-2", value === id ? "border-2 border-[#002fa7] bg-[#f3f6fd] p-[13px]" : "border-[#bdbcb5] hover:border-[#101115]")}>
            <input type="radio" name="role" value={id} checked={value === id} onChange={() => onChange(id)} className="sr-only" />
            <span className={cx("grid h-8 w-8 place-items-center rounded-[8px]", value === id ? "bg-[#002fa7] text-white" : "bg-[#f1f1ee] text-[#4a4c55]")}><Icon size={18} aria-hidden="true" /></span>
            <span className="font-display text-[14px] font-semibold leading-5">{title}</span>
            <span className="text-[13px] leading-[18px] text-[#6e7079]">{hint}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function LoginPage({ initialRegistering = false, initialRole = "customer" }) {
  const router = useRouter();
  const [registering, setRegistering] = useState(initialRegistering);
  const [method, setMethod] = useState("code"); // code | password
  const [step, setStep] = useState("form"); // form | code | role | 2fa
  const [name, setName] = useState("");
  const [role, setRole] = useState(initialRole === "business_owner" ? "business_owner" : "customer");
  const [phone, setPhone] = useState("");
  const [signupToken, setSignupToken] = useState(""); // set when Google confirmed the person but we still need their role
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState(""); // set when the first check passed and an authenticator code is still needed
  const [enroll, setEnroll] = useState(false); // true when this account has no authenticator yet (always the case for a new admin)
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeInput = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => { if (step === "code") codeInput.current?.focus(); }, [step]);

  function switchMode(next) {
    router.replace(`${next ? "/register" : "/login"}${window.location.search}`);
    setRegistering(next); setStep("form"); setChallenge(""); setSignupToken(""); setFieldErrors({}); setError(""); setNotice(""); setCode("");
  }

  function validate() {
    const errors = {};
    if (registering && name.trim().length < 2) errors.name = "Enter your full name.";
    if (registering && role === "business_owner" && !phone.trim()) errors.phone = "Enter your mobile number. Customers use it to reach you.";
    else if (registering && phone.trim() && !phonePattern.test(cleanPhone(phone))) errors.phone = "Enter a valid 10-digit mobile number.";
    if (!emailPattern.test(email.trim())) errors.email = "Enter a valid email address, like name@example.com.";
    if (method === "password" && password.length < 8) errors.password = "Password must be at least 8 characters.";
    if (registering && !terms) errors.terms = "Please agree to the Terms and Privacy Policy.";
    setFieldErrors(errors);
    const count = Object.keys(errors).length;
    setError(count ? `Please fix ${count} field${count > 1 ? "s" : ""} below before continuing.` : "");
    return count === 0;
  }

  function finish(data) {
    saveSession(data.accessToken);
    window.dispatchEvent(new Event("storage"));
    const next = new URLSearchParams(window.location.search).get("next");
    router.push(["admin", "super_admin"].includes(data.user.role) ? "/admin" : next && next.startsWith("/") && !next.startsWith("//") ? next : data.user.role === "business_owner" ? "/business-owner" : "/account");
  }

  async function sendCode() {
    const result = await call("/auth/otp/request", { email: email.trim().toLowerCase(), ...(registering ? { role, ...(name.trim() ? { name: name.trim() } : {}), ...(phone.trim() ? { phone: cleanPhone(phone) } : {}) } : {}) });
    const devCode = result.data?.devCode;
    setStep("code"); setCode(devCode || ""); setCooldown(30);
    setNotice(devCode ? `Test mode: email isn’t set up yet, so your code is ${devCode}. It is filled in for you.` : result.message || "We sent a 6-digit code to your email.");
  }

  async function submit(event) {
    event.preventDefault();
    setNotice("");
    if (!validate()) return;
    setBusy(true);
    try {
      if (method === "code") await sendCode();
      else {
        const body = await call(`/auth/${registering ? "register" : "login"}`, { ...(registering ? { name: name.trim(), role, ...(phone.trim() ? { phone: cleanPhone(phone) } : {}) } : {}), email: email.trim().toLowerCase(), password });
        if (body.data?.requires2fa) startSecondFactor(body.data);
        else if (registering) { setStep("code"); setCode(body.data?.devCode || ""); setCooldown(30); setNotice(body.data?.devCode ? `Test mode: email isn’t set up yet, so your code is ${body.data.devCode}.` : body.message || "We sent a 6-digit code to your email."); }
        else finish(body.data);
      }
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  async function verify(event) {
    event.preventDefault();
    if (code.length !== 6) { setError("Enter the 6-digit code from your email."); return; }
    setBusy(true); setError("");
    try { const body = await call("/auth/otp/verify", { email: email.trim().toLowerCase(), code }); if (body.data?.requires2fa) startSecondFactor(body.data); else finish(body.data); }
    catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  // Google gave us a signed token. Existing accounts sign in straight away; new ones on the "Create account" tab use the role already
  // chosen; a brand-new person on "Sign in" is asked who they are first.
  async function onGoogle(credential) {
    setBusy(true); setError(""); setNotice("");
    try {
      const body = await call("/auth/google", { credential, ...(registering ? { role, ...(phone.trim() && phonePattern.test(cleanPhone(phone)) ? { phone: cleanPhone(phone) } : {}) } : {}) });
      if (body.data?.needsRole) { setSignupToken(body.data.signupToken); setName(body.data.profile?.name || ""); setEmail(body.data.profile?.email || ""); setStep("role"); }
      else if (body.data?.requires2fa) startSecondFactor(body.data);
      else finish(body.data);
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }
  async function finishGoogleSignup(event) {
    event.preventDefault();
    if (role === "business_owner" && !phone.trim()) { setFieldErrors({ phone: "Enter your mobile number. Customers use it to reach you." }); return; }
    if (phone.trim() && !phonePattern.test(cleanPhone(phone))) { setFieldErrors({ phone: "Enter a valid 10-digit mobile number." }); return; }
    setBusy(true); setError(""); setFieldErrors({});
    try { const body = await call("/auth/google", { signupToken, role, ...(phone.trim() ? { phone: cleanPhone(phone) } : {}) }); finish(body.data); }
    catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  function startSecondFactor(data) { setChallenge(data.challenge); setEnroll(Boolean(data.enroll)); setStep("2fa"); setError(""); setNotice(""); setCode(""); }
  const beginSetup = useCallback(() => call("/auth/login/2fa/setup", { challenge }).then((body) => body.data), [challenge]);
  const confirmSetup = useCallback((value) => call("/auth/login/2fa/enroll", { challenge, code: value }).then((body) => body.data), [challenge]);
  async function verifyAuthenticator(value) {
    setBusy(true); setError("");
    try { const body = await call("/auth/login/2fa", { challenge, code: value }); finish(body.data); }
    catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  async function resend() {
    setBusy(true); setError("");
    try { await sendCode(); } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  const title = step === "role" ? "One last step" : step === "2fa" ? (enroll ? "Set up two-step verification" : "Two-step verification") : step === "code" ? "Check your email" : registering ? "Create your account" : "Sign in to Lokal Lens";

  return (
    <main className="min-h-screen bg-[#f1f1ee] text-[#101115] grid grid-cols-[minmax(0,1fr)] lg:h-screen lg:grid-cols-[440px_minmax(0,1fr)] xl:grid-cols-[560px_minmax(0,1fr)]">
      {/* Editorial panel */}
      <aside className="flex flex-col gap-6 bg-[#002fa7] px-5 py-6 text-white sm:px-8 lg:h-screen lg:min-h-0 lg:px-10 lg:py-8 xl:px-12 xl:py-10">
        <Link href="/" aria-label="Lokal Lens home" className="w-fit"><Logo theme="blue" /></Link>
        <div className="relative hidden min-h-[120px] flex-1 overflow-hidden rounded-[20px] lg:block">
          <Image src="/figma/auth-spice.jpg" alt="" fill priority sizes="504px" className="object-cover" />
        </div>
        <div className="flex max-w-[480px] flex-col gap-3">
          <p className="font-serif text-[22px] leading-8 tracking-[-0.0115em] text-white lg:text-[26px] lg:leading-[34px]">Keep your shortlist, write reviews, and manage your business profile.</p>
          <p className="font-eyebrow text-[#f4b8c8]">Browsing and contacting businesses never requires an account</p>
        </div>
      </aside>

      {/* Form area */}
      <section className="flex items-center justify-center px-5 py-10 sm:px-12 lg:h-screen lg:overflow-y-auto lg:py-6">
        <div className="m-auto flex w-full max-w-[420px] flex-col gap-4 xl:gap-5">
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.0294em] xl:text-[34px] xl:leading-[42px]">{title}</h1>

          {step === "form" && (
            <div className="flex gap-1 rounded-[12px] border border-[#dcdbd5] bg-white p-1" role="tablist" aria-label="Account">
              {[["Sign in", false], ["Create account", true]].map(([label, value]) => (
                <button key={label} type="button" role="tab" aria-selected={registering === value} onClick={() => switchMode(value)} className={cx("h-10 flex-1 rounded-[8px] font-display text-[13px] font-medium transition-colors", registering === value ? "bg-[#002fa7] text-white" : "text-[#101115] hover:bg-[#f1f1ee]")}>{label}</button>
              ))}
            </div>
          )}

          {error && <p role="alert" className="flex items-start gap-2.5 rounded-[10px] bg-[#fce9e7] px-3.5 py-3 text-[14px] leading-5 text-[#b42318]"><AlertCircle size={18} className="mt-px shrink-0" aria-hidden="true" />{error}</p>}
          {notice && !error && <p role="status" className="rounded-[10px] bg-[#e7f4e5] px-3.5 py-3 text-[14px] leading-5 text-[#2b7a26]">{notice}</p>}

          {step === "2fa" ? (
            enroll
              ? <div className="flex flex-col gap-4"><p className="text-[15px] leading-6 text-[#4a4c55]">Admin accounts need a second check. It takes a minute, and you only do it once.</p><TwoFactorSetup start={beginSetup} confirm={confirmSetup} onDone={finish} doneLabel="Finish signing in" /></div>
              : <TwoFactorVerify onSubmit={verifyAuthenticator} busy={busy} error="" onBack={() => { setStep("form"); setChallenge(""); setError(""); }} />
          ) : step === "role" ? (
            <form onSubmit={finishGoogleSignup} noValidate className="flex flex-col gap-4">
              <p className="text-[15px] leading-6 text-[#4a4c55]">Welcome{name ? `, ${name.split(" ")[0]}` : ""}. Your Google account <strong className="text-[#101115]">{email}</strong> is verified. Tell us how you’ll use Lokal Lens.</p>
              <RoleChoice value={role} onChange={setRole} />
              <Field label="Mobile number" optional={role !== "business_owner"} error={fieldErrors.phone} helper={role === "business_owner" ? "Customers and our team use it to reach you." : "Only used by our team to reach you."}>
                <input value={phone} onChange={(event) => setPhone(event.target.value.replace(/[^\d+\s-]/g, "").slice(0, 16))} type="tel" inputMode="tel" autoComplete="tel" placeholder="10-digit mobile number" aria-invalid={Boolean(fieldErrors.phone)} className={cx(fieldClass, fieldErrors.phone && "!border-2 !border-[#b42318]")} />
              </Field>
              <Button type="primary" htmlType="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : "Create my account"}</Button>
              <button type="button" onClick={() => { setStep("form"); setSignupToken(""); setError(""); setFieldErrors({}); }} className="self-start text-[14px] font-medium text-[#002fa7] hover:underline">Cancel</button>
            </form>
          ) : step === "form" ? (
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
              {registering && <RoleChoice value={role} onChange={setRole} />}
              {registering && (
                <Field label="Full name" error={fieldErrors.name}>
                  <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your name" maxLength={120} aria-invalid={Boolean(fieldErrors.name)} className={cx(fieldClass, fieldErrors.name && "!border-2 !border-[#b42318]")} />
                </Field>
              )}
              <Field label="Email address" error={fieldErrors.email} helper={registering ? "Email is not shown publicly." : undefined}>
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="name@example.com" aria-invalid={Boolean(fieldErrors.email)} className={cx(fieldClass, fieldErrors.email && "!border-2 !border-[#b42318]")} />
              </Field>
              {registering && (
                <Field label="Mobile number" optional={role !== "business_owner"} error={fieldErrors.phone} helper={role === "business_owner" ? "Customers and our team use it to reach you." : "Only used by our team to reach you."}>
                  <input value={phone} onChange={(event) => setPhone(event.target.value.replace(/[^\d+\s-]/g, "").slice(0, 16))} type="tel" inputMode="tel" autoComplete="tel" placeholder="10-digit mobile number" aria-invalid={Boolean(fieldErrors.phone)} className={cx(fieldClass, fieldErrors.phone && "!border-2 !border-[#b42318]")} />
                </Field>
              )}
              {method === "password" && (
                <Field label="Password" error={fieldErrors.password}>
                  <span className="relative block">
                    <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} autoComplete={registering ? "new-password" : "current-password"} placeholder={registering ? "At least 8 characters" : "Your password"} aria-invalid={Boolean(fieldErrors.password)} className={cx(fieldClass, "pr-12", fieldErrors.password && "!border-2 !border-[#b42318]")} />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a4c55] hover:text-[#101115]">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                  </span>
                </Field>
              )}
              {registering && (
                <div>
                  <label className="flex min-h-11 items-center gap-3 text-[16px] leading-6"><input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} className="h-[18px] w-[18px] shrink-0 accent-[#002fa7]" />
                    <span>I agree to the <Link href="/privacy" className="text-[#002fa7] underline">Terms and Privacy Policy</Link></span></label>
                  {fieldErrors.terms && <p role="alert" className="text-[14px] leading-5 text-[#b42318]">{fieldErrors.terms}</p>}
                </div>
              )}
              <Button type="primary" htmlType="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : method === "code" ? (registering ? "Create account & send code" : "Send code") : (registering ? "Create account" : "Sign in")}</Button>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[14px] leading-5 text-[#4a4c55]">
                <p>{registering ? "Already have an account?" : "New here?"} <button type="button" onClick={() => switchMode(!registering)} className="font-medium text-[#002fa7] hover:underline">{registering ? "Sign in" : "Create an account."}</button></p>
                <button type="button" onClick={() => { setMethod(method === "code" ? "password" : "code"); setError(""); setFieldErrors({}); }} className="font-medium text-[#002fa7] hover:underline">{method === "code" ? "Use password instead" : "Email me a code instead"}</button>
              </div>
              {method === "password" && !registering && <p className="-mt-2 text-[14px]"><Link href="/forgot-password" className="font-medium text-[#002fa7] hover:underline">Forgot password?</Link></p>}
              {GOOGLE_CLIENT_ID && (
                <>
                  <div className="flex items-center gap-3 text-[13px] text-[#6e7079]"><span className="h-px flex-1 bg-[#dcdbd5]" />or<span className="h-px flex-1 bg-[#dcdbd5]" /></div>
                  <GoogleSignIn onCredential={onGoogle} text={registering ? "signup_with" : "signin_with"} disabled={busy} />
                </>
              )}
            </form>
          ) : (
            <form onSubmit={verify} className="flex flex-col gap-5">
              <p className="text-[16px] leading-6 text-[#4a4c55]">Enter the 6-digit code we sent to <strong className="text-[#101115]">{email}</strong>. It expires in 10 minutes.</p>
              <Field label="6-digit code">
                <input ref={codeInput} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" maxLength={6} className={cx(fieldClass, "text-center font-mono text-[24px] tracking-[0.4em]")} />
              </Field>
              <Button type="primary" htmlType="submit" className="w-full" disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Verify & continue"}</Button>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[14px] leading-5">
                <button type="button" onClick={() => { setStep("form"); setChallenge(""); setError(""); setNotice(""); }} className="font-medium text-[#002fa7] hover:underline">Change email</button>
                <button type="button" onClick={resend} disabled={cooldown > 0 || busy} className="font-medium text-[#002fa7] hover:underline disabled:text-[#9a9ba1] disabled:no-underline">{cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}</button>
              </div>
            </form>
          )}

          {process.env.NODE_ENV !== "production" && step === "form" && (
            <div className="rounded-[12px] border border-dashed border-[#bdbcb5] bg-[#f7f7f4] p-3.5 text-[13px] leading-5">
              <p className="font-eyebrow text-[#6e7079]">Test accounts (local only)</p>
              <div className="mt-2 flex flex-col gap-1.5">
                {[["Owner", "owner@lokallens.test"], ["Customer", "customer@lokallens.test"], ["Admin", "admin@lokallens.test"]].map(([label, address]) => (
                  <button key={address} type="button" onClick={() => { setRegistering(false); setMethod("password"); setEmail(address); setPassword("Test@12345"); setError(""); setFieldErrors({}); setNotice(""); }} className="flex items-center justify-between gap-2 rounded-[8px] bg-white px-3 py-2 text-left hover:bg-[#e6ebf7]"><span><strong>{label}</strong> · {address}</span><span className="font-medium text-[#002fa7]">Use</span></button>
                ))}
              </div>
              <p className="mt-2 text-[#6e7079]">Password for all: Test@12345 · Email codes show on screen in test mode.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
