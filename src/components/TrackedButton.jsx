"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Globe, Navigation, Phone, X } from "lucide-react";
import { Button } from "@/components/ds";

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000/api/v1")).replace(/\/$/, "");

// The WhatsApp mark (green), so the button is recognised at a glance.
function WhatsAppLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="#25D366" style={{ flexShrink: 0, minWidth: size, minHeight: size }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

// Each action shows its own mark: a phone, the WhatsApp logo, a map arrow (Google-Maps blue) and a globe.
const icon = (event, size) => ({
  call: <Phone size={size} aria-hidden="true" />,
  whatsapp: <WhatsAppLogo size={size} />,
  directions: <Navigation size={size} color="#1a73e8" fill="#1a73e8" aria-hidden="true" />,
  website: <Globe size={size} aria-hidden="true" />,
})[event];

// Figma "Dialog / External action": what each button says before it leaves Lokal Lens. The phone number is never written out here.
const COPY = {
  call: { title: (n) => `Call ${n}?`, body: (d) => `This opens your phone app to call ${d.name}. Lokal Lens doesn’t place or record the call.`, note: "Opens your phone app", confirm: "Call now" },
  whatsapp: { title: () => "Continue to WhatsApp", body: () => "You’ll leave Lokal Lens and open a WhatsApp chat with this business. We don’t see your messages.", note: "Opens wa.me in a new tab", confirm: "Open WhatsApp" },
  directions: { title: () => "Get directions", body: () => "Opens Google Maps with the business address pre-filled.", note: "Opens an external map service", confirm: "Open Maps" },
  website: { title: () => "Visit website", body: () => "You’re leaving Lokal Lens for the business’s own website — an external site we don’t control.", note: "Opens in a new tab", confirm: "Visit site" },
};

function Dialog({ event, name, label, onCancel, onConfirm }) {
  const copy = COPY[event];
  const confirmRef = useRef(null);
  useEffect(() => {
    confirmRef.current?.focus();
    const key = (keyEvent) => { if (keyEvent.key === "Escape") onCancel(); };
    document.addEventListener("keydown", key);
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = previous; };
  }, [onCancel]);
  // Drawn straight on the page body, above everything (the sticky tab bar used to sit on top of it when it was drawn inside the page).
  return createPortal(
    <div className="fixed inset-0 grid place-items-center bg-[#101115]/[.48] p-4" style={{ zIndex: 2000 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="ext-title" className="flex w-full max-w-[440px] flex-col gap-4 rounded-[20px] bg-white p-7 shadow-[0_24px_64px_rgba(16,17,21,.24)]">
        <div className="flex items-start justify-between">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e6ebf7] text-[#002fa7]">{icon(event, 24)}</span>
          <button type="button" onClick={onCancel} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-full border border-[#dcdbd5] bg-white hover:border-[#101115]"><X size={20} aria-hidden="true" /></button>
        </div>
        <h2 id="ext-title" className="text-[24px] font-semibold leading-8 tracking-[-0.0208em]">{copy.title(name)}</h2>
        <p className="text-[16px] leading-6 text-[#4a4c55]">{copy.body({ name, label })}</p>
        <p className="flex items-center gap-1.5 font-eyebrow text-[#6e7079]"><ExternalLink size={14} aria-hidden="true" />{copy.note}</p>
        <div className="flex justify-end gap-2">
          <Button type="secondary" onClick={onCancel}>Cancel</Button>
          <button ref={confirmRef} type="button" onClick={onConfirm} className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[#002fa7] px-[22px] font-display text-[15px] font-medium text-white hover:bg-[#00248a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002fa7] focus-visible:ring-offset-2">{copy.confirm}<ExternalLink size={18} aria-hidden="true" /></button>
        </div>
      </div>
    </div>,
    document.body,
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
      <Button {...props} icon={icon(event, 18) ?? props.icon} onClick={() => setOpen(true)} trailingIcon={external ? <ExternalLink size={18} aria-hidden="true" /> : undefined}>{children}</Button>
      {open && <Dialog event={event} name={businessName} label={label} onCancel={() => setOpen(false)} onConfirm={go} />}
    </>
  );
}
