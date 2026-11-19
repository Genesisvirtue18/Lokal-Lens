"use client";

import { useEffect, useState } from "react";
import { submitBusinessLead } from "@/lib/api";
import { request } from "@/dashboard/api";

export default function BusinessContactForm({ businessId, businessName, services = [] }) {
  const [status, setStatus] = useState({ message: "", error: false });
  const [sending, setSending] = useState(false);
  const [me, setMe] = useState(null); // a signed-in customer's own details, so they don't retype them

  useEffect(() => {
    let live = true;
    let token = "";
    try { token = localStorage.getItem("directflow_access_token") || ""; } catch { /* signed out */ }
    if (!token) return undefined;
    request("/auth/me").then((data) => { if (live && data.user) setMe({ name: data.user.name || "", phone: data.user.phone || "", email: data.user.email || "" }); }).catch(() => {});
    return () => { live = false; };
  }, []);

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setSending(true);
    setStatus({ message: "", error: false });
    try {
      const result = await submitBusinessLead(businessId, {
        name: formData.get("name"),
        phone: formData.get("phone"),
        email: formData.get("email") || "",
        service: formData.get("service") || undefined,
        message: formData.get("message"),
      });
      form.reset();
      setStatus({ message: `Your inquiry was sent to ${businessName}.`, error: false });
      if (Number.isFinite(result?.item?.leadCount)) {
        window.dispatchEvent(new CustomEvent("business-lead-submitted", { detail: { businessId, leadCount: result.item.leadCount } }));
      }
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : "Unable to send your inquiry. Please try again.", error: true });
    } finally {
      setSending(false);
    }
  }

  // Inputs must not inherit the bold label weight, otherwise placeholders and typed text look heavy.
  const fieldClass = "mt-1.5 h-12 w-full rounded-[10px] border border-[#bdbcb5] bg-white px-3.5 text-[16px] font-normal text-[#101115] placeholder:font-normal placeholder:text-[#6e7079] outline-none transition hover:border-[#101115] focus:border-2 focus:border-[#002fa7] focus:px-[13px]";
  const labelClass = "block font-display text-[14px] font-medium leading-5 text-[#101115]";
  return <form id="contact" onSubmit={submit} className="scroll-mt-32 rounded-[20px] border border-[#dcdbd5] bg-white p-6">
    <h2 className="font-display text-[18px] font-semibold leading-[26px] tracking-[-0.0111em] text-[#101115]">Send an inquiry</h2>
    <p className="mt-0.5 text-[13px] leading-5 text-[#4a4c55]">{businessName} will get your details and reply to you.</p>
    <div className="mt-3.5 space-y-3">
      <label className={labelClass}>Your name<input key={`n-${me?.name || ""}`} defaultValue={me?.name || ""} name="name" required minLength={2} maxLength={120} autoComplete="name" placeholder="Full name" className={fieldClass} /></label>
      <label className={labelClass}>Phone number<input key={`p-${me?.phone || ""}`} defaultValue={me?.phone || ""} name="phone" required minLength={7} maxLength={16} type="tel" inputMode="tel" autoComplete="tel" placeholder="10-digit mobile number" onInput={(event) => { event.currentTarget.value = event.currentTarget.value.replace(/[^\d+\s-]/g, "").slice(0, 16); }} className={fieldClass} /></label>
      <label className={labelClass}>Message<textarea name="message" required minLength={5} maxLength={2000} rows={3} placeholder="How can the business help you?" className="mt-1.5 w-full resize-none rounded-[10px] border border-[#bdbcb5] bg-white px-3.5 py-3 text-[16px] font-normal leading-6 text-[#101115] placeholder:font-normal placeholder:text-[#6e7079] outline-none transition hover:border-[#101115] focus:border-2 focus:border-[#002fa7] focus:px-[13px]" /></label>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-[13px] font-medium text-[#002fa7] hover:underline"><span className="transition group-open:rotate-90">›</span>Add email or choose a service (optional)</summary>
        <div className="mt-3 space-y-3">
          <label className={labelClass}>Email address<input key={`e-${me?.email || ""}`} defaultValue={me?.email || ""} name="email" type="email" maxLength={254} autoComplete="email" placeholder="you@example.com" className={fieldClass} /></label>
          {services.length > 0 && <label className={labelClass}>Service<select name="service" defaultValue="" className={fieldClass}><option value="">Choose a service</option>{services.map(service => <option key={service} value={service}>{service}</option>)}</select></label>}
        </div>
      </details>
    </div>
    {status.message && <p role={status.error ? "alert" : "status"} className={`mt-3 rounded-[10px] px-3 py-2 text-[14px] leading-5 ${status.error ? "bg-[#fbe9e7] text-[#b3261e]" : "bg-[#e7f4e5] text-[#2b7a26]"}`}>{status.message}</p>}
    <button type="submit" disabled={sending} className="mt-4 flex h-12 w-full items-center justify-center rounded-[12px] bg-[#002fa7] px-5 font-display text-[15px] font-medium text-white transition hover:bg-[#00247f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#002fa7] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
      {sending ? "Sending…" : "Send inquiry"}
    </button>
    <p className="mt-2.5 text-center text-[12px] leading-4 text-[#4a4c55]">Your details are shared only with this business.</p>
  </form>;
}
