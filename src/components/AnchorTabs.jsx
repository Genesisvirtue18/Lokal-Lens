"use client";

import { useEffect, useState } from "react";

// Sticky section tabs for the business profile; the active tab follows the section in view.
export default function AnchorTabs({ tabs }) {
  const [active, setActive] = useState(tabs[0]?.id);

  useEffect(() => {
    const targets = tabs.map((tab) => document.getElementById(tab.id)).filter(Boolean);
    if (!targets.length) return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: "-140px 0px -60% 0px", threshold: 0 });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [tabs]);

  return (
    <nav aria-label="Business profile sections" className="sticky top-[76px] z-30 -mx-1 flex gap-7 overflow-x-auto border-b border-[#dcdbd5] bg-[#f1f1ee] px-1">
      {tabs.map((tab) => (
        <a key={tab.id} href={`#${tab.id}`} aria-current={active === tab.id ? "true" : undefined} className={`shrink-0 border-b-[3px] py-3.5 font-display text-[14px] font-medium leading-5 transition-colors ${active === tab.id ? "border-[#002fa7] text-[#002fa7]" : "border-transparent text-[#4a4c55] hover:text-[#101115]"}`}>{tab.label}</a>
      ))}
    </nav>
  );
}
