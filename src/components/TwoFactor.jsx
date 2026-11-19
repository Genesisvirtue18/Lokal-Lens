"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, ShieldCheck } from "lucide-react";
import { Button, Field, cx, fieldClass } from "@/components/ds";

// Two small pieces for authenticator-app (Google Authenticator, Microsoft Authenticator, Authy, 1Password) verification.

/** Asks for the 6-digit code, or one of the backup codes. */
export function TwoFactorVerify({ onSubmit, onBack, busy, error, title = "Enter the code from your authenticator app", hint }) {
  const [code, setCode] = useState("");
  const input = useRef(null);
  useEffect(() => { input.current?.focus(); }, []);
  const ready = code.replace(/\s/g, "").length >= 6;
  return (
    <form onSubmit={(event) => { event.preventDefault(); if (ready) onSubmit(code.trim()); }} className="flex flex-col gap-5">
      <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e6ebf7] text-[#002fa7]"><ShieldCheck size={20} aria-hidden="true" /></span><p className="text-[16px] leading-6 text-[#4a4c55]">{title}. {hint || "Open the app on your phone and type the 6-digit code for Lokal Lens."}</p></div>
      <Field label="Authenticator code" error={error}>
        <input ref={input} value={code} onChange={(event) => setCode(event.target.value.slice(0, 24))} inputMode="text" autoComplete="one-time-code" placeholder="000000" aria-invalid={Boolean(error)} className={cx(fieldClass, "text-center font-mono text-[22px] tracking-[0.25em]", error && "!border-2 !border-[#b42318]")} />
      </Field>
      <Button type="primary" htmlType="submit" className="w-full" disabled={busy || !ready}>{busy ? "Checking…" : "Verify & continue"}</Button>
      <p className="text-[14px] leading-5 text-[#6e7079]">Lost your phone? Type one of your backup codes instead (like <span className="font-mono">a1b2c-3d4e5</span>). Each works once.</p>
      {onBack && <button type="button" onClick={onBack} className="self-start text-[14px] font-medium text-[#002fa7] hover:underline">Use a different account</button>}
    </form>
  );
}

/** Shows the QR code, checks the first code, then shows the backup codes. `start()` returns { secret, otpauthUrl }; `confirm(code)` returns { recoveryCodes }. */
export function TwoFactorSetup({ start, confirm, onDone, doneLabel = "Continue" }) {
  const [setup, setSetup] = useState(null);
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState({ busy: false, error: "" });
  const [codes, setCodes] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let live = true;
    start().then((data) => { if (live) setSetup(data); }).catch((reason) => { if (live) setState({ busy: false, error: reason.message || "Unable to start the setup" }); });
    return () => { live = false; };
  }, [start]);
  useEffect(() => {
    if (!setup?.otpauthUrl) return undefined;
    let live = true;
    QRCode.toDataURL(setup.otpauthUrl, { width: 220, margin: 1 }).then((url) => { if (live) setQr(url); }).catch(() => {});
    return () => { live = false; };
  }, [setup]);

  async function submit(event) {
    event.preventDefault();
    setState({ busy: true, error: "" });
    try { const data = await confirm(code.trim()); setResult(data); setCodes(data.recoveryCodes || []); setState({ busy: false, error: "" }); }
    catch (reason) { setState({ busy: false, error: reason.message || "That code isn’t right" }); }
  }
  const text = codes ? `Lokal Lens backup codes\nEach code works once. Keep them somewhere safe.\n\n${codes.join("\n")}\n` : "";
  async function copy() { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* the codes stay on screen */ } }
  function download() { const url = URL.createObjectURL(new Blob([text], { type: "text/plain" })); const link = document.createElement("a"); link.href = url; link.download = "lokal-lens-backup-codes.txt"; link.click(); URL.revokeObjectURL(url); }

  if (codes) {
    return (
      <div className="flex flex-col gap-4">
        <div><h2 className="text-[18px] font-semibold leading-[26px]">Save your backup codes</h2><p className="text-[14px] leading-5 text-[#4a4c55]">If you lose your phone, each of these lets you sign in once. They are shown only now. Store them in a password manager or print them.</p></div>
        <ul className="grid grid-cols-2 gap-2 rounded-[12px] bg-[#f7f7f4] p-4 font-mono text-[16px]">{codes.map((item) => <li key={item}>{item}</li>)}</ul>
        <div className="flex flex-wrap gap-2"><Button type="secondary" size="s" onClick={copy} icon={copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}>{copied ? "Copied" : "Copy"}</Button><Button type="secondary" size="s" onClick={download} icon={<Download size={16} aria-hidden="true" />}>Download</Button></div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]"><input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} className="h-[18px] w-[18px] accent-[#002fa7]" />I saved these codes</label>
        <Button type="primary" onClick={() => onDone(result)} disabled={!saved}>{doneLabel}</Button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <ol className="flex flex-col gap-1.5 text-[15px] leading-6 text-[#2f3138]">
        <li><span className="font-semibold">1.</span> Install an authenticator app (Google Authenticator, Microsoft Authenticator, Authy or 1Password).</li>
        <li><span className="font-semibold">2.</span> Scan this code with the app, or type the key by hand.</li>
        <li><span className="font-semibold">3.</span> Type the 6-digit code the app shows.</li>
      </ol>
      <div className="flex flex-wrap items-center gap-4">
        {/* The QR code is a generated data: image, so there is nothing for next/image to optimise. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="grid h-[220px] w-[220px] shrink-0 place-items-center rounded-[12px] border border-[#dcdbd5] bg-white">{qr ? <img src={qr} alt="QR code for your authenticator app" width={220} height={220} /> : <span className="text-[13px] text-[#6e7079]">Preparing…</span>}</div>
        <div className="min-w-0 flex-1 text-[13px] leading-5 text-[#4a4c55]"><p>Can’t scan? Enter this key:</p><p className="mt-1 break-all rounded-[8px] bg-[#f7f7f4] px-3 py-2 font-mono text-[14px] text-[#101115] select-all">{setup?.secret || "…"}</p></div>
      </div>
      <Field label="6-digit code" error={state.error}><input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" maxLength={6} className={cx(fieldClass, "max-w-[220px] text-center font-mono text-[20px] tracking-[0.25em]", state.error && "!border-2 !border-[#b42318]")} /></Field>
      <div><Button type="primary" htmlType="submit" disabled={state.busy || code.length !== 6 || !setup}>{state.busy ? "Checking…" : "Turn on"}</Button></div>
    </form>
  );
}
