"use client";

import { useState } from "react";
import { Check, Clock, Copy, Info, Tag } from "lucide-react";
import { cx } from "@/components/ds";

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through to the older way */ }
  try {
    const area = document.createElement("textarea");
    area.value = text; area.style.position = "fixed"; area.style.opacity = "0";
    document.body.appendChild(area); area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch { return false; }
}

function endsText(validUntil) {
  if (!validUntil) return null;
  const end = new Date(validUntil);
  if (Number.isNaN(end.getTime())) return null;
  const days = Math.ceil((end.getTime() - Date.now()) / 86400000);
  const date = end.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  if (days <= 0) return { label: "Ends today", urgent: true };
  if (days <= 7) return { label: `${days} day${days === 1 ? "" : "s"} left`, urgent: true };
  return { label: `Valid till ${date}`, urgent: false };
}

function OfferCard({ offer }) {
  const [copied, setCopied] = useState(false);
  const ends = endsText(offer.validUntil);
  const copy = async () => { if (await copyText(offer.code)) { setCopied(true); window.setTimeout(() => setCopied(false), 1800); } };
  return (
    <article className="group flex flex-col gap-3 rounded-[16px] border border-[#dcdbd5] bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#002fa7]/40 hover:shadow-[0_8px_24px_rgba(16,17,21,.08)] sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e6ebf7] text-[#002fa7]"><Tag size={18} aria-hidden="true" /></span>
        {offer.occasion && <span className="rounded-full bg-[#f1f1ee] px-2.5 py-1 font-display text-[12px] font-medium text-[#4a4c55]">{offer.occasion}</span>}
        {ends && <span className={cx("ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-display text-[12px] font-medium", ends.urgent ? "bg-[#fbf0d9] text-[#5c3d00]" : "bg-[#f1f1ee] text-[#4a4c55]")}><Clock size={12} aria-hidden="true" />{ends.label}</span>}
      </div>
      <div>
        <h3 className="font-display text-[18px] font-semibold leading-6">{offer.title}</h3>
        {offer.description && <p className="mt-1.5 text-[14px] leading-5 text-[#4a4c55]">{offer.description}</p>}
      </div>
      {offer.code && (
        <button type="button" onClick={copy} aria-label={copied ? "Code copied" : `Copy code ${offer.code}`} className="flex h-12 items-center justify-between gap-3 rounded-[12px] border border-dashed border-[#002fa7]/50 bg-[#f3f6fd] px-4 text-left transition-colors hover:bg-[#e6ebf7]">
          <span className="flex min-w-0 flex-col"><span className="font-eyebrow text-[10px] text-[#4a4c55]">Offer code</span><span className="truncate font-mono text-[15px] font-semibold tracking-[0.04em] text-[#002fa7]">{offer.code}</span></span>
          <span className={cx("inline-flex shrink-0 items-center gap-1.5 font-display text-[13px] font-medium", copied ? "text-[#2b7a26]" : "text-[#002fa7]")}>{copied ? <><Check size={16} aria-hidden="true" />Copied</> : <><Copy size={16} aria-hidden="true" />Copy</>}</span>
        </button>
      )}
      {offer.howToAvail && <p className="mt-auto flex items-start gap-2 rounded-[10px] bg-[#f7f7f4] px-3 py-2.5 text-[14px] leading-5 text-[#2f3138]"><Info size={16} className="mt-0.5 shrink-0 text-[#002fa7]" aria-hidden="true" /><span><span className="font-semibold">How to get it: </span>{offer.howToAvail}</span></p>}
    </article>
  );
}

/** The business's current offers: the code copies with one tap, and the owner's own instructions ("Show this code at the shop") sit under it. */
export default function OfferCards({ offers = [] }) {
  return <div className="grid gap-4 sm:grid-cols-2">{offers.map((offer) => <OfferCard key={offer._id || offer.title} offer={offer} />)}</div>;
}
