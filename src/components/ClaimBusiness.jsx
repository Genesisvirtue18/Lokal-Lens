"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { FileUp, MailCheck, ShieldCheck } from "lucide-react";
import { Button, fieldClass } from "@/components/ds";
import { authedFetch, request, uploadBusinessDocuments } from "@/dashboard/api";
import { clean } from "@/lib/business-validation";

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000/api/v1")).replace(/\/$/, "");
const RELATIONS = [["owner", "I am the owner"], ["manager", "I manage it for the owner"], ["employee", "I work here"], ["agency", "I work for an agency that manages it"], ["other", "Something else"]];

// "Is this your business?" on a public profile. Owners send proof, an admin checks it and hands the listing over.
export default function ClaimBusiness({ businessId, businessName }) {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState(null); // null = not checked, false = signed out, object = signed in
  const [form, setForm] = useState({ relationship: "owner", phone: "", message: "" });
  const [proof, setProof] = useState({ url: "", name: "", busy: false });
  const [state, setState] = useState({ busy: false, error: "", done: "" });
  const file = useRef(null);
  const [options, setOptions] = useState(null); // what proof is possible for this listing
  const [verify, setVerify] = useState({ sent: false, busy: false, masked: "", code: "", note: "", error: "" });

  useEffect(() => {
    if (!open || account !== null) return undefined;
    let live = true;
    let token = "";
    try { token = localStorage.getItem("directflow_access_token") || ""; } catch { /* signed out */ }
    if (!token) { setTimeout(() => { if (live) setAccount(false); }, 0); return () => { live = false; }; }
    request("/auth/me").then((data) => { if (live) setAccount(data.user || false); }).catch(() => { if (live) setAccount(false); });
    return () => { live = false; };
  }, [open, account]);
  useEffect(() => {
    if (!open || !account || options) return undefined;
    let live = true;
    request(`/businesses/${businessId}/claims/options`).then((data) => { if (live) setOptions(data); }).catch(() => { if (live) setOptions({}); });
    return () => { live = false; };
  }, [open, account, options, businessId]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function pick(files) {
    const chosen = files?.[0];
    if (!chosen) return;
    if (chosen.size > 5 * 1024 * 1024) { setState((s) => ({ ...s, error: "That file is over 5 MB." })); return; }
    setProof({ url: "", name: chosen.name, busy: true }); setState((s) => ({ ...s, error: "" }));
    try { const [url] = await uploadBusinessDocuments([chosen]); setProof({ url, name: chosen.name, busy: false }); }
    catch (error) { setProof({ url: "", name: "", busy: false }); setState((s) => ({ ...s, error: error instanceof Error ? error.message : "Upload failed" })); }
  }
  async function sendCode() {
    setVerify((v) => ({ ...v, busy: true, error: "", note: "" }));
    try {
      const data = await request(`/businesses/${businessId}/claims/code`, { method: "POST", body: "{}" });
      setVerify({ sent: true, busy: false, masked: data.maskedEmail || "", code: data.devCode || "", note: data.devCode ? `Test mode: no email service yet, so the code is ${data.devCode}. It is filled in.` : `We sent a 6-digit code to ${data.maskedEmail}. It expires in ${data.expiresInMinutes || 10} minutes.`, error: "" });
    } catch (error) { setVerify((v) => ({ ...v, busy: false, error: error instanceof Error ? error.message : "Couldn’t send the code" })); }
  }
  async function send() {
    setState({ busy: true, error: "", done: "" });
    try {
      const response = await authedFetch(`${apiUrl}/businesses/${businessId}/claims`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, ...(verify.sent && /^\d{6}$/.test(verify.code) ? { emailCode: verify.code } : {}), ...(proof.url ? { documentUrl: proof.url } : {}) }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.errors?.[0]?.message || body.message || "Unable to send the claim");
      setState({ busy: false, error: "", done: body.message || "Claim sent." });
    } catch (error) { setState({ busy: false, error: error instanceof Error ? error.message : "Unable to send the claim", done: "" }); }
  }
  const phoneOk = /^\d{10}$/.test(form.phone);
  const valid = phoneOk && form.message.trim().length >= 10;
  const next = typeof window === "undefined" ? "/" : encodeURIComponent(window.location.pathname);

  return (
    <>
      <section className="flex items-start gap-3 rounded-[16px] border border-[#dcdbd5] bg-white p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[#e6ebf7] text-[#002fa7]"><ShieldCheck size={20} aria-hidden="true" /></span>
        <div className="min-w-0"><p className="font-display text-[15px] font-semibold leading-5">Is this your business?</p><p className="text-[14px] leading-5 text-[#4a4c55]">Claim it to update the details, reply to reviews and get inquiries.</p><button type="button" onClick={() => setOpen(true)} className="mt-2 font-display text-[14px] font-semibold text-[#002fa7] hover:underline">Claim this listing</button></div>
      </section>

      {open && createPortal(
        <div role="dialog" aria-modal="true" aria-label={`Claim ${businessName}`} className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#101115]/50 p-4" onClick={() => !state.busy && setOpen(false)}>
          <div className="flex w-full max-w-[500px] flex-col gap-4 rounded-[20px] bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div><h2 className="text-[22px] font-semibold leading-8">Claim “{businessName}”</h2><p className="mt-1 text-[14px] leading-5 text-[#4a4c55]">{options?.instant ? "This listing was added by our team. Verify with an email code and it moves to your account straight away." : "Tell us how you’re connected and add proof. Our team checks it and emails you. The current owner is told about your claim."}</p></div>
            {state.done ? (
              <>
                <p role="status" className="rounded-[10px] bg-[#e7f4e5] px-4 py-3 text-[15px] leading-6 text-[#1f5c1b]">{state.done}</p>
                <div className="flex justify-end"><Button type="primary" size="s" onClick={() => setOpen(false)}>Done</Button></div>
              </>
            ) : account === null ? <p className="text-[14px] text-[#6e7079]">Checking your account…</p> : account === false ? (
              <>
                <p className="text-[15px] leading-6">Sign in with your business owner account to claim this listing.</p>
                <div className="flex flex-wrap justify-end gap-2"><Button type="ghost" size="s" onClick={() => setOpen(false)}>Not now</Button><Button type="secondary" size="s" href={`/register?next=${next}`}>Create an account</Button><Button type="primary" size="s" href={`/login?next=${next}`}>Sign in</Button></div>
              </>
            ) : ["admin", "super_admin"].includes(account.role) ? (
              <>
                <p className="rounded-[10px] bg-[#fbf0d9] px-4 py-3 text-[14px] leading-5 text-[#5c3d00]">Admin accounts can’t claim listings. Use the Businesses tab in the admin panel to assign an owner.</p>
                <div className="flex justify-end"><Button type="primary" size="s" onClick={() => setOpen(false)}>Close</Button></div>
              </>
            ) : (
              <>
                <label className="flex flex-col gap-1.5 text-[14px] font-medium">Your connection<select value={form.relationship} onChange={(event) => setForm({ ...form, relationship: event.target.value })} className={fieldClass}>{RELATIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="flex flex-col gap-1.5 text-[14px] font-medium">Your phone number<input value={form.phone} onChange={(event) => setForm({ ...form, phone: clean.phone(event.target.value) })} type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" className={fieldClass} /></label>
                <label className="flex flex-col gap-1.5 text-[14px] font-medium">Why is it yours?<textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value.slice(0, 1500) })} rows={4} placeholder="e.g. I run this clinic since 2018. The phone number on the listing is my old one." className="rounded-[10px] border border-[#bdbcb5] p-3 text-[16px] font-normal outline-none focus:border-2 focus:border-[#002fa7]" /></label>
                {options?.emailCode && (
                  <div className="flex flex-col gap-2 rounded-[12px] border border-[#cfd9f3] bg-[#f3f6fd] p-3.5">
                    <p className="flex items-center gap-2 font-display text-[14px] font-semibold"><MailCheck size={18} className="text-[#002fa7]" aria-hidden="true" />Verify with email <span className="font-normal text-[#6e7079]">(fastest)</span></p>
                    {!verify.sent ? (
                      <><p className="text-[13px] leading-[18px] text-[#4a4c55]">We’ll send a code to the email on this listing: <strong>{options.maskedEmail}</strong>. Only the business can read it.</p>
                      <div><Button type="secondary" size="s" onClick={sendCode} disabled={verify.busy}>{verify.busy ? "Sending…" : "Send code"}</Button></div></>
                    ) : (
                      <><p className="text-[13px] leading-[18px] text-[#4a4c55]">{verify.note}</p>
                      <input value={verify.code} onChange={(event) => setVerify((v) => ({ ...v, code: event.target.value.replace(/\D/g, "").slice(0, 6) }))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" aria-label="6-digit code" className={`${fieldClass} text-center font-mono text-[20px] tracking-[0.35em]`} />
                      <button type="button" onClick={sendCode} disabled={verify.busy} className="self-start text-[13px] font-medium text-[#002fa7] hover:underline disabled:opacity-60">Send a new code</button></>
                    )}
                    {verify.error && <p role="alert" className="text-[13px] text-[#8c1d13]">{verify.error}</p>}
                  </div>
                )}
                <div className="flex flex-col gap-1.5"><span className="font-display text-[14px] font-medium">Proof <span className="font-normal text-[#6e7079]">{options?.emailCode ? "(or verify by email above)" : "(recommended)"}</span></span>
                  <input ref={file} type="file" accept="image/jpeg,image/png,application/pdf" hidden onChange={(event) => { void pick(event.target.files); event.target.value = ""; }} />
                  <button type="button" onClick={() => file.current?.click()} disabled={proof.busy} className="flex items-center gap-3 rounded-[12px] border border-dashed border-[#bdbcb5] px-4 py-3 text-left hover:border-[#002fa7] disabled:opacity-60"><FileUp size={20} className="shrink-0 text-[#002fa7]" aria-hidden="true" /><span className="text-[14px] leading-5">{proof.busy ? "Uploading…" : proof.url ? `${proof.name} uploaded. Tap to replace.` : "Upload a photo or PDF (up to 5 MB)"}</span></button>
                </div>
                {state.error && <p role="alert" className="rounded-[10px] bg-[#fdecea] px-3 py-2 text-[14px] text-[#8c1d13]">{state.error}</p>}
                <div className="flex justify-end gap-2"><Button type="ghost" size="s" onClick={() => setOpen(false)} disabled={state.busy}>Cancel</Button><Button type="primary" size="s" onClick={send} disabled={state.busy || proof.busy || !valid}>{state.busy ? "Sending…" : "Send claim"}</Button></div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
