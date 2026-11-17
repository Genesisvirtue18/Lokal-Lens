"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Logo, fieldClass, labelClass } from "@/components/ds";
import { useRouter } from "next/navigation";

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "https://directory-backend-ai6r.onrender.com/api/v1").replace(/\/$/, "");
const inputClass = `mt-1.5 ${fieldClass}`;

function Shell({ title, subtitle, children }) {
  return <main className="grid min-h-screen place-items-center bg-[#f1f1ee] px-5 py-10 text-[#101115]">
    <div className="w-full max-w-[430px]">
      <Link href="/" aria-label="Lokal Lens home" className="mx-auto mb-8 block w-fit"><Logo /></Link>
      <div className="rounded-[20px] border border-[#dcdbd5] bg-white p-6 shadow-[0_1px_2px_rgba(16,17,21,.04),0_8px_24px_rgba(16,17,21,.06)] sm:p-8">
        <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.0294em]">{title}</h1>
        <p className="mt-2 text-[14px] leading-6 text-[#4a4c55]">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  </main>;
}

async function post(path, payload) {
  const response = await fetch(`${apiUrl}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.errors?.[0]?.message || body.message || "Something went wrong. Please try again.");
  return body;
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState({ busy: false, done: false, error: "" });
  async function submit(event) {
    event.preventDefault();
    setState({ busy: true, done: false, error: "" });
    try { await post("/auth/forgot-password", { email: email.trim() }); setState({ busy: false, done: true, error: "" }); }
    catch (reason) { setState({ busy: false, done: false, error: reason.message }); }
  }
  return <Shell title="Forgot your password?" subtitle="Enter the email you signed up with and we will send you a link to choose a new password.">
    {state.done ? <div role="status" className="rounded-[10px] bg-[#e7f4e5] p-4 text-[14px] text-[#2b7a26]">If an account exists for <strong>{email}</strong>, a reset link is on its way. The link works for 1 hour.</div>
      : <form onSubmit={submit} className="space-y-4">
        {state.error && <p role="alert" className="rounded-[10px] bg-[#fce9e7] px-3.5 py-3 text-[14px] text-[#b42318]">{state.error}</p>}
        <label className={`block ${labelClass}`}>Email<input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" className={inputClass}/></label>
        <Button type="primary" htmlType="submit" className="w-full" disabled={state.busy}>{state.busy ? "Sending…" : "Send reset link"}</Button>
      </form>}
    <p className="mt-6 text-center text-[14px]"><Link href="/login" className="font-semibold text-[#002fa7]">Back to sign in</Link></p>
  </Shell>;
}

export function ResetPasswordForm({ token }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState({ busy: false, done: false, error: "" });
  async function submit(event) {
    event.preventDefault();
    if (password !== confirm) { setState({ busy: false, done: false, error: "Passwords do not match." }); return; }
    setState({ busy: true, done: false, error: "" });
    try { await post("/auth/reset-password", { token, password }); setState({ busy: false, done: true, error: "" }); setTimeout(() => router.push("/login"), 2500); }
    catch (reason) { setState({ busy: false, done: false, error: reason.message }); }
  }
  if (!token) return <Shell title="Reset link missing" subtitle="This page needs the link from your email."><Link href="/forgot-password" className="font-semibold text-[#002fa7]">Request a new reset link</Link></Shell>;
  return <Shell title="Choose a new password" subtitle="Use at least 8 characters. You will be signed out on other devices.">
    {state.done ? <div role="status" className="rounded-[10px] bg-[#e7f4e5] p-4 text-[14px] text-[#2b7a26]">Password updated. Taking you to sign in…</div>
      : <form onSubmit={submit} className="space-y-4">
        {state.error && <p role="alert" className="rounded-[10px] bg-[#fce9e7] px-3.5 py-3 text-[14px] text-[#b42318]">{state.error} {state.error.includes("expired") && <Link href="/forgot-password" className="font-semibold underline">Get a new link</Link>}</p>}
        <label className={`block ${labelClass}`}>New password<input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className={inputClass}/></label>
        <label className={`block ${labelClass}`}>Confirm new password<input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} className={inputClass}/></label>
        <Button type="primary" htmlType="submit" className="w-full" disabled={state.busy}>{state.busy ? "Saving…" : "Update password"}</Button>
      </form>}
  </Shell>;
}
