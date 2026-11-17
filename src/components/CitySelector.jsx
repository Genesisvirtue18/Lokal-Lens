"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, MapPin, Search } from "lucide-react";

const COOKIE = "lokal_city";

// City picker with search. Choosing a city reloads the page for that city and remembers the choice.
export default function CitySelector({ cities = [], current = "", basePath = "/", className = "" }) {
  const router = useRouter();
  const listId = useId();
  const box = useRef(null);
  const input = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const items = useMemo(() => cities.map((city) => (typeof city === "string" ? { name: city } : city)).filter((city) => city?.name), [cities]);
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? items.filter((city) => city.name.toLowerCase().includes(term)) : items;
  }, [items, query]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (box.current && !box.current.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    input.current?.focus();
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function choose(name) {
    try {
      document.cookie = name ? `${COOKIE}=${encodeURIComponent(name)}; path=/; max-age=31536000; samesite=lax` : `${COOKIE}=; path=/; max-age=0; samesite=lax`;
    } catch { /* the choice still applies to this visit */ }
    setOpen(false); setQuery("");
    router.push(`${basePath}?city=${encodeURIComponent(name)}`);
  }

  return (
    <div ref={box} className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} className={`flex h-11 items-center gap-1.5 rounded-[22px] border bg-white px-3 font-display text-[14px] font-medium leading-5 text-[#101115] transition-colors hover:border-[#101115] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002fa7] focus-visible:ring-offset-2 ${open ? "border-[#002fa7]" : "border-[#dcdbd5]"}`}>
        <MapPin size={18} className="shrink-0 text-[#002fa7]" />
        <span className="max-w-[130px] truncate">{current || "All cities"}</span>
        <ChevronDown size={16} className={`shrink-0 text-[#6e7079] transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[300px] max-w-[88vw] overflow-hidden rounded-[16px] border border-[#dcdbd5] bg-white shadow-[0_8px_24px_rgba(16,17,21,.10)]">
          <div className="border-b border-[#ecebe7] p-2.5">
            <label className="flex h-10 items-center gap-2 rounded-xl border border-[#d9d8d2] px-3 focus-within:border-[#002fa7] focus-within:ring-2 focus-within:ring-[#002fa7]/15">
              <Search size={15} className="shrink-0 text-[#4a4c55]" />
              <input ref={input} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && visible.length === 1) choose(visible[0].name); }} placeholder="Search city" aria-label="Search city" className="w-full bg-transparent text-[14px] outline-none placeholder:text-[#4a4c55]" />
            </label>
          </div>
          <ul id={listId} role="listbox" className="max-h-72 overflow-y-auto py-1">
            {!query.trim() && (
              <li role="option" aria-selected={!current}>
                <button type="button" onClick={() => choose("")} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[14px] hover:bg-[#f1f1ee]"><span className="font-medium">All cities</span>{!current && <Check size={16} className="text-[#002fa7]" />}</button>
              </li>
            )}
            {visible.map((city) => {
              const selected = city.name.toLowerCase() === current.toLowerCase();
              return (
                <li key={city.name} role="option" aria-selected={selected}>
                  <button type="button" onClick={() => choose(city.name)} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[14px] hover:bg-[#f1f1ee]">
                    <span className={`truncate ${selected ? "font-semibold text-[#002fa7]" : ""}`}>{city.name}</span>
                    {selected ? <Check size={16} className="shrink-0 text-[#002fa7]" /> : city.count ? <span className="shrink-0 text-[12px] text-[#4a4c55]">{city.count}</span> : null}
                  </button>
                </li>
              );
            })}
            {visible.length === 0 && <li className="px-4 py-3 text-[14px] text-[#4a4c55]">No city found for “{query.trim()}”.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
