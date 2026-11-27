"use client";

import { useEffect, useRef, useState } from "react";

// Section tabs for the business profile; the active tab follows the section in view.
// On a computer they sit right under the sticky site header. On a phone the header scrolls away (it is tall there), so they stick to the top.
export default function AnchorTabs({ tabs }) {
  const barRef = useRef(null);
  const [active, setActive] = useState(tabs[0]?.id);
  const [top, setTop] = useState(0);
  const [offset, setOffset] = useState(120);   // how far down a section's top must be to count as "in view" (bars + a little air)

  useEffect(() => {
    const header = document.querySelector("header");
    const apply = () => {
      const stuck = header ? getComputedStyle(header).position === "sticky" : false;
      const headerHeight = stuck ? Math.round(header.getBoundingClientRect().height) : 0;
      setTop(headerHeight);
      const total = headerHeight + 52 + 16;                                   // header (if it stays) + tab bar + air
      setOffset(total);
      document.documentElement.style.setProperty("--sticky-offset", `${total}px`);
    };
    apply();
    const observer = header ? new ResizeObserver(apply) : null;
    if (header) observer.observe(header);
    window.addEventListener("resize", apply);
    return () => { observer?.disconnect(); window.removeEventListener("resize", apply); };
  }, []);

  useEffect(() => {
    const targets = tabs.map((tab) => document.getElementById(tab.id)).filter(Boolean);
    if (!targets.length) return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: `-${offset}px 0px -60% 0px`, threshold: 0 });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [tabs, offset]);

  // As the page scrolls into a new section, the tab bar slides sideways so the active tab is always in view (no scroll bar shown).
  useEffect(() => {
    const bar = barRef.current;
    const current = bar?.querySelector('[aria-current="true"]');
    if (!bar || !current) return;
    bar.scrollTo({ left: current.offsetLeft - (bar.clientWidth - current.offsetWidth) / 2, behavior: "smooth" });
  }, [active]);

  return (
    <nav ref={barRef} aria-label="Business profile sections" style={{ top, scrollbarWidth: "none" }} className="hide-scrollbar sticky z-30 -mx-1 flex gap-4 overflow-x-auto border-b border-[#dcdbd5] bg-[#f1f1ee] px-1 sm:gap-7">
      {tabs.map((tab) => (
        <a key={tab.id} href={`#${tab.id}`} aria-current={active === tab.id ? "true" : undefined} className={`shrink-0 border-b-[3px] py-3.5 font-display text-[14px] font-medium leading-5 transition-colors ${active === tab.id ? "border-[#002fa7] text-[#002fa7]" : "border-transparent text-[#4a4c55] hover:text-[#101115]"}`}>{tab.label}</a>
      ))}
    </nav>
  );
}
