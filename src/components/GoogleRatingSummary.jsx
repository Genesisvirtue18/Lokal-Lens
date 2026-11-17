"use client";

import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { getGoogleReviews } from "@/lib/api";

export default function GoogleRatingSummary({ businessId, enabled }) {
  const target = useRef(null);
  const requested = useRef(false);
  const [rating, setRating] = useState(null);

  useEffect(() => {
    if (!enabled || !businessId || !target.current || requested.current) return undefined;
    const controller = new AbortController();
    const load = async () => {
      requested.current = true;
      try {
        const data = await getGoogleReviews(businessId, controller.signal, true);
        if (!controller.signal.aborted && data?.available && data.rating !== null) {
          setRating({ value: Number(data.rating), count: Number(data.ratingCount || 0) });
        }
      } catch { /* Google ratings are supplementary; keep the rest of the card usable. */ }
    };

    if (typeof IntersectionObserver === "undefined") {
      void load();
      return () => controller.abort();
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        void load();
      }
    }, { rootMargin: "80px" });
    observer.observe(target.current);
    return () => { observer.disconnect(); controller.abort(); };
  }, [businessId, enabled]);

  if (!enabled || !businessId) return null;

  return <div ref={target} aria-live="polite" className="min-h-[32px]">
    {rating && <div className="flex items-center gap-2 text-[#1746b5]" aria-label={`${rating.value.toFixed(1)} from ${rating.count.toLocaleString()} Google ratings`}>
      <span className="text-[17px] font-medium leading-none tabular-nums text-[#101115]">{rating.value.toFixed(1)}</span>
      <div>
        <div className="flex gap-0.5">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={12} className={index < Math.round(rating.value) ? "fill-current" : "text-[#c8d1e7]"}/>)}</div>
        <span className="text-[12px] text-[#1746b5]">{rating.count.toLocaleString()} Google ratings</span>
      </div>
    </div>}
  </div>;
}
