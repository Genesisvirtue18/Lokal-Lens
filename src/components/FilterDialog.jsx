"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cx } from "@/components/ds";

/**
 * The "Filters" button and the drawer it opens: every filter in one place, with a "Show N results" button at the bottom.
 * The drawer slides in from the left edge on every screen size (full width on a small phone).
 * `children` are the filter fields (inside a form with id "filters-form"); `footer` holds Clear all and the submit button.
 */
export default function FilterDialog({ count = 0, children, footer }) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);   // drives the slide-in / slide-out

  function openDrawer() { setOpen(true); }
  function closeDrawer() { setShown(false); window.setTimeout(() => setOpen(false), 220); }

  useEffect(() => {
    if (!open) return undefined;
    const frame = requestAnimationFrame(() => setShown(true));
    const key = (event) => { if (event.key === "Escape") { setShown(false); window.setTimeout(() => setOpen(false), 220); } };
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", key);
    return () => { cancelAnimationFrame(frame); document.body.style.overflow = before; document.removeEventListener("keydown", key); };
  }, [open]);

  return (
    <>
      <button type="button" onClick={openDrawer} aria-haspopup="dialog"
        className={cx("inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 font-display text-[14px] font-semibold transition-colors", count > 0 ? "border-[#002fa7] bg-[#002fa7] text-white" : "border-[#101115] bg-white text-[#101115] hover:bg-[#f7f7f4]")}>
        <SlidersHorizontal size={16} aria-hidden="true" />Filters
        {count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-semibold leading-none text-[#002fa7]">{count}</span>}
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Filters" style={{ position: "fixed", inset: 0, zIndex: 70 }}>
          <div onClick={closeDrawer} style={{ position: "absolute", inset: 0, background: "rgba(16,17,21,.5)", opacity: shown ? 1 : 0, transition: "opacity 220ms ease" }} />
          <aside style={{ position: "absolute", top: 0, left: 0, bottom: 0, display: "flex", flexDirection: "column", width: "min(440px, 100%)", background: "#fff", boxShadow: "12px 0 40px rgba(16,17,21,.25)", transform: shown ? "translateX(0)" : "translateX(-100%)", transition: "transform 220ms ease" }}>
            <div className="flex shrink-0 items-center justify-between border-b border-[#dcdbd5] bg-white px-5 py-4">
              <h2 className="text-[20px] font-semibold leading-7">Filters</h2>
              <button type="button" aria-label="Close filters" onClick={closeDrawer} className="grid h-10 w-10 place-items-center rounded-full border border-[#dcdbd5] hover:border-[#101115]"><X size={18} aria-hidden="true" /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-[#f1f1ee] px-4 py-4">{children}</div>
            <div className="shrink-0 border-t border-[#dcdbd5] bg-white px-5 py-3" style={{ boxShadow: "0 -8px 20px rgba(16,17,21,.06)" }}>{footer}</div>
          </aside>
        </div>
      )}
    </>
  );
}
