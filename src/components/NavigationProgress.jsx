"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// A thin blue bar at the very top: it starts the moment someone taps a link to another page and finishes when that page has arrived.
// It is moved straight on the element (no React state), so it costs nothing while the page is idle.
function Bar() {
  const bar = useRef(null);
  const timers = useRef([]);
  const pathname = usePathname();
  const search = useSearchParams().toString();

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const set = (width, opacity, ms) => {
    const el = bar.current;
    if (!el) return;
    el.style.transition = `width ${ms}ms ease-out, opacity 250ms ease`;
    el.style.width = `${width}%`; el.style.opacity = String(opacity);
  };

  useEffect(() => {
    const start = () => {
      clear(); set(0, 1, 0);
      timers.current.push(setTimeout(() => set(30, 1, 400), 20), setTimeout(() => set(65, 1, 1800), 450), setTimeout(() => set(85, 1, 6000), 2300));
    };
    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };
    document.addEventListener("click", onClick);
    return () => { document.removeEventListener("click", onClick); clear(); };
  }, []);

  // The new page is here: run to the end, then fade out.
  useEffect(() => {
    clear(); set(100, 1, 200);
    timers.current.push(setTimeout(() => set(100, 0, 0), 260), setTimeout(() => set(0, 0, 0), 520));
  }, [pathname, search]);

  return <div aria-hidden="true" className="pointer-events-none fixed left-0 top-0 h-[3px] bg-[#002fa7]" style={{ width: 0, opacity: 0, zIndex: 3000 }} ref={bar} />;
}

export default function NavigationProgress() {
  return <Suspense fallback={null}><Bar /></Suspense>;
}
