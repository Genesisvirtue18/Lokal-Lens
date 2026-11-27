"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Phone: one card at a time in a row you can swipe, with arrow buttons that move one card at a time. From "sm" up it is the normal grid.
export default function CardCarousel({ children }) {
  const track = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const [index, setIndex] = useState(0);
  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    const card = el.firstElementChild;
    if (card) setIndex(Math.round(el.scrollLeft / (card.getBoundingClientRect().width + 16)));
  }, []);
  useEffect(() => {
    const el = track.current;
    if (!el) return undefined;
    const frame = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", update); };
  }, [update, children]);
  const move = (direction) => {
    const el = track.current;
    const card = el?.firstElementChild;
    if (!el || !card) return;
    el.scrollBy({ left: direction * (card.getBoundingClientRect().width + 16), behavior: "smooth" });
  };
  const count = Children.count(children);
  const arrow = "grid h-10 w-10 place-items-center rounded-full border border-[#002fa7] bg-white text-[#002fa7] transition-colors enabled:active:bg-[#e6ebf7] disabled:border-[#dcdbd5] disabled:text-[#bdbcb5]";
  return (
    <div>
      {count > 1 && (
        <div className="mt-4 flex items-center justify-between sm:hidden">
          <p className="font-display text-[13px] font-medium text-[#4a4c55]" aria-live="polite">{Math.min(index + 1, count)} of {count}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => move(-1)} disabled={edge.start} aria-label="Previous business" className={arrow}><ChevronLeft size={22} aria-hidden="true" /></button>
            <button type="button" onClick={() => move(1)} disabled={edge.end} aria-label="Next business" className={arrow}><ChevronRight size={22} aria-hidden="true" /></button>
          </div>
        </div>
      )}
      <div ref={track} onScroll={update} className="mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] sm:mt-5 sm:grid sm:snap-none sm:gap-5 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {children}
      </div>
    </div>
  );
}
