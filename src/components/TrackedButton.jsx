"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Globe, MessageCircle, Navigation, Phone, X } from "lucide-react";
import { Button } from "@/components/ds";

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "https://directory-backend-ai6r.onrender.com/api/v1").replace(/\/$/, "");

// Figma "Dialog / External action": what each button says before it leaves Lokal Lens.
const COPY = {
  call: { icon: Phone, title: (n) => `Call ${n}?`, body: (d) => `This opens your phone app to call ${d.label}. Lokal Lens doesn’t place or record the call.`, note: "Opens your phone app", confirm: "Call now" },
  whatsapp: { icon: MessageCircle, title: () => "Continue to WhatsApp", body: () => "You’ll leave Lokal Lens and open a WhatsApp chat with this business. We don’t see your messages.", note: "Opens wa.me in a new tab", confirm: "Open WhatsApp" },
  directions: { icon: Navigation, title: () => "Get directions", body: () => "Opens Google Maps with the business address pre-filled.", note: "Opens an external map service", confirm: "Open Maps" },
  website: { icon: Globe, title: () => "Visit website", body: (d) => `You’re leaving Lokal Lens for ${d.label} — an external site we don’t control.`, note: "Opens in a new tab", confirm: "Visit site" },
};

function Dialog({ event, name, label, onCancel, onConfirm }) {
  const copy = COPY[event];
  const Icon = copy.icon;
  const confirmRef = useRef(null);
  useEffect(() => {
    confirmRef.current?.focus();
    const key = (keyEvent) => { if (keyEvent.key === "Escape") onCancel(); };
    document.addEventListener("keydown", key);
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = previous; };
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#101115]/[.48] p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="ext-title" className="flex w-full max-w-[440px] flex-col gap-4 rounded-[20px] bg-white p-7 shadow-[0_24px_64px_rgba(16,17,21,.24)]">
        <div className="flex items-start justify-between">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e6ebf7] text-[#002fa7]"><Icon size={22} aria-hidden="true" /></span>
          <button type="button" onClick={onCancel} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-full border border-[#dcdbd5] bg-white hover:border-[#101115]"><X size={20} aria-hidden="true" /></button>
        </div>
        <h2 id="ext-title" className="text-[24px] font-semibold leading-8 tracking-[-0.0208em]">{copy.title(name)}</h2>
        <p className="text-[16px] leading-6 text-[#4a4c55]">{copy.body({ label })}</p>
        <p className="flex items-center gap-1.5 font-eyebrow text-[#6e7079]"><ExternalLink size={14} aria-hidden="true" />{copy.note}</p>
        <div className="flex justify-end gap-2">
          <Button type="secondary" onClick={onCancel}>Cancel</Button>
          <button ref={confirmRef} type="button" onClick={onConfirm} className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[#002fa7] px-[22px] font-display text-[15px] font-medium text-white hover:bg-[#00248a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002fa7] focus-visible:ring-offset-2">{copy.confirm}<ExternalLink size={18} aria-hidden="true" /></button>
        </div>
      </div>
    </div>
  );
}

// A Button for Call / WhatsApp / Directions / Website. It asks first (like the Figma dialogs), then goes, and counts the click
// for the owner's analytics (nothing about the visitor is sent). Without a businessId (owner preview) nothing is counted.
export default function TrackedButton({ businessId, event, href, businessName = "this business", label = "", external = false, children, ...props }) {
  const [open, setOpen] = useState(false);
  const go = () => {
    setOpen(false);
    if (businessId) { try { fetch(`${apiUrl}/businesses/${businessId}/events`, { method: "POST", headers: { "Content-Type": "application/json", ...(typeof localStorage !== "undefined" && localStorage.getItem("directflow_access_token") ? { Authorization: `Bearer ${localStorage.getItem("directflow_access_token")}` } : {}) }, body: JSON.stringify({ type: event }), keepalive: true }).catch(() => {}); } catch { /* counting is best effort */ } }
    if (event === "call") window.location.href = href; else window.open(href, "_blank", "noopener,noreferrer");
  };
  return (
    <>
      <Button {...props} onClick={() => setOpen(true)} trailingIcon={external ? <ExternalLink size={18} aria-hidden="true" /> : undefined}>{children}</Button>
      {open && <Dialog event={event} name={businessName} label={label} onCancel={() => setOpen(false)} onConfirm={go} />}
    </>
  );
}
