"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { authedFetch } from "@/dashboard/api";
import { Check, Copy, Heart, Share2 } from "lucide-react";

export const SAVED_BUSINESSES_KEY = "lokal-lens-saved-businesses";

function isSavedBusiness(id) {
  try { return JSON.parse(localStorage.getItem(SAVED_BUSINESSES_KEY) || "[]").some(item => item.id === id); }
  catch { return false; }
}

export function subscribeSaved(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener("lokal-saved-businesses-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("lokal-saved-businesses-change", callback);
  };
}

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000/api/v1")).replace(/\/$/, "");
// Signed-in people also keep their saved list on the account, so it follows them to other devices. Best-effort: the local list always works.
function syncToAccount(id, save) {
  try {
    if (!localStorage.getItem("directflow_access_token") || !/^[a-f0-9]{24}$/i.test(String(id))) return;
    authedFetch(`${apiUrl}/users/me/saved/${id}`, { method: save ? "PUT" : "DELETE" }).catch(() => {});
  } catch { /* ignore */ }
}

export default function BusinessProfileActions({ business, compact = false }) {
  const saved = useSyncExternalStore(subscribeSaved, () => isSavedBusiness(business.id), () => false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null); // { icon, text, action }
  const flash = (next) => { setToast(next); window.setTimeout(() => setToast(null), 3200); };

  function toggleSaved() {
    try {
      const stored = JSON.parse(localStorage.getItem(SAVED_BUSINESSES_KEY) || "[]");
      const savedRecord = { id:business.id, name:business.name, href:business.href, category:business.category, area:business.area, city:business.city, address:business.address, image:business.image, description:business.description, hasGooglePlaceId:business.hasGooglePlaceId, verified:business.verified, phone:business.phone, isFeatured:business.isFeatured };
      const next = saved ? stored.filter(item => item.id !== business.id) : [...stored.filter(item => item.id !== business.id), savedRecord];
      localStorage.setItem(SAVED_BUSINESSES_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("lokal-saved-businesses-change"));
      syncToAccount(business.id, !saved);
      if (!compact) flash(saved ? { icon: "heart", text: "Removed from saved", undo: true } : localStorage.getItem("directflow_access_token") ? { icon: "check", text: "Saved to your list", href: "/saved", action: "View saved" } : { icon: "check", text: "Saved on this device", href: "/login", action: "Sign in to keep it everywhere" });
    } catch { /* Storage can be unavailable in private browsing modes. */ }
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: business.name, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1800); flash({ icon: "copy", text: "Link copied" }); }
    } catch { /* User cancelled the native share sheet. */ }
  }

  if (compact) return <button type="button" title={saved?"Remove from saved businesses":"Save this business"} aria-label={saved?`Remove ${business.name} from saved businesses`:`Save ${business.name}`} aria-pressed={saved} onClick={toggleSaved} className="grid h-11 w-11 place-items-center rounded-full border border-[#dcdbd5] bg-white text-[#101115] transition-colors hover:bg-[#f1f1ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002fa7] focus-visible:ring-offset-2"><Heart size={20} className={saved ? "fill-[#002fa7] text-[#002fa7]" : ""} aria-hidden="true" /></button>;

  const buttonClass = "inline-flex h-11 items-center gap-2 rounded-[12px] border border-[#bdbcb5] bg-white px-4 font-display text-[14px] font-medium text-[#101115] transition-colors hover:border-[#101115] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002fa7] focus-visible:ring-offset-2";
  const Icon = toast?.icon === "heart" ? Heart : toast?.icon === "copy" ? Copy : Check;
  return <div className="flex items-center gap-2">
    <button type="button" aria-pressed={saved} onClick={toggleSaved} className={buttonClass}><Heart size={18} className={saved ? "fill-[#002fa7] text-[#002fa7]" : ""} aria-hidden="true" />{saved ? "Saved" : "Save"}</button>
    <button type="button" onClick={share} className={buttonClass}>{copied ? <Check size={18} aria-hidden="true" /> : <Share2 size={18} aria-hidden="true" />}{copied ? "Link copied" : "Share"}</button>
    {toast && <div role="status" className="fixed bottom-6 left-1/2 z-[70] flex h-14 -translate-x-1/2 items-center gap-3 rounded-[12px] bg-[#101115] py-1.5 pl-4 pr-2 text-white shadow-[0_8px_24px_rgba(16,17,21,.3)]"><Icon size={20} aria-hidden="true" /><span className="text-[16px] leading-6">{toast.text}</span>{toast.action && <Link href={toast.href} className="flex h-11 items-center rounded-[8px] px-3 font-display text-[14px] font-medium text-[#f4b8c8] hover:bg-white/10">{toast.action}</Link>}{toast.undo && <button type="button" onClick={() => { setToast(null); toggleSaved(); }} className="flex h-11 items-center rounded-[8px] px-3 font-display text-[14px] font-medium text-[#f4b8c8] hover:bg-white/10">Undo</button>}</div>}
  </div>;
}
