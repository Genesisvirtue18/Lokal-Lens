"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search, Store, Tag } from "lucide-react";
import { Button, cx } from "@/components/ds";
import { businessDetailPath } from "@/lib/directory-data";

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "https://directory-backend-ai6r.onrender.com/api/v1").replace(/\/$/, "");

// Search module: Figma "Brand, header & footer / Search module".
// White card, 20px radius, 8px padding. Fields are 14px radius with a Poppins label and an 18px DM Sans value.
export default function SearchBox({ cities = [], defaultCity = "" }) {
  const router = useRouter();
  const listId = useId();
  const box = useRef(null);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState(defaultCity);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [data, setData] = useState({ categories: [], businesses: [], cities: [] });

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: term, ...(city ? { city } : {}) });
        const response = await fetch(`${apiUrl}/search/suggest?${params}`, { signal: controller.signal });
        const body = await response.json();
        if (response.ok) { setData({ categories: body.data?.categories || [], businesses: body.data?.businesses || [], cities: body.data?.cities || [] }); setActive(-1); }
      } catch { /* keep the previous suggestions */ }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, city]);

  useEffect(() => {
    const close = (event) => { if (box.current && !box.current.contains(event.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const cityQuery = city ? `&city=${encodeURIComponent(city)}` : "";
  const typed = query.trim().length >= 2;
  const groups = typed ? [
    { label: "Businesses", items: data.businesses.map((item) => ({ key: `b-${item._id}`, title: item.name, sub: [item.category?.name, item.address?.locality || item.address?.city].filter(Boolean).join(" · "), icon: Store, href: businessDetailPath(item) })) },
    { label: "Categories", items: data.categories.map((item) => ({ key: `c-${item._id}`, title: item.name, sub: "Category", icon: Tag, href: `/directory?category=${encodeURIComponent(item.slug)}${cityQuery}` })) },
    { label: "Locations", items: data.cities.map((name) => ({ key: `y-${name}`, title: name, sub: `${query.trim()} in ${name}`, icon: MapPin, href: `/directory?q=${encodeURIComponent(query.trim())}&city=${encodeURIComponent(name)}` })) },
  ].filter((group) => group.items.length) : [];
  const options = groups.flatMap((group) => group.items);
  const go = (href) => { setOpen(false); router.push(href); };

  function onKeyDown(event) {
    if (event.key === "Escape") { setOpen(false); return; }
    if (!options.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((value) => (value + 1) % options.length); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => (value <= 0 ? options.length - 1 : value - 1)); }
    else if (event.key === "Enter" && active >= 0) { event.preventDefault(); go(options[active].href); }
  }

  function submit(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (city) params.set("city", city);
    setOpen(false);
    router.push(`/directory${params.size ? `?${params}` : ""}`);
  }

  return (
    <form onSubmit={submit} role="search" className="flex flex-col gap-1 rounded-[20px] border border-[#dcdbd5] bg-white p-2 shadow-[0_1px_2px_rgba(16,17,21,.04),0_8px_24px_rgba(16,17,21,.06)] sm:flex-row sm:items-center sm:gap-0">
      <div ref={box} className="relative min-w-0 flex-1">
        <label className={cx("flex min-w-0 items-center gap-3 rounded-[14px] px-4 py-[10px] transition-colors", open && typed ? "bg-[#e6ebf7]" : "")}>
          <Search size={22} className="shrink-0 text-[#101115]" aria-hidden="true" />
          <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <span className="font-display text-[13px] font-medium leading-[18px] text-[#4a4c55]">What are you looking for?</span>
            <input name="q" value={query} autoComplete="off" role="combobox" aria-expanded={open && options.length > 0} aria-controls={listId} aria-autocomplete="list" onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKeyDown} placeholder="Business, service or category" className="w-full truncate bg-transparent text-[18px] leading-7 text-[#101115] outline-none placeholder:text-[#6e7079]" />
          </span>
        </label>
        {open && options.length > 0 && (
          <div id={listId} role="listbox" className="absolute left-0 top-full z-30 mt-3 w-[min(560px,calc(100vw-32px))] overflow-hidden rounded-[16px] border border-[#dcdbd5] bg-white py-2 shadow-[0_1px_2px_rgba(16,17,21,.04),0_12px_32px_rgba(16,17,21,.10)]">
            {groups.map((group) => {
              return (
                <div key={group.label} className="px-2 pb-1">
                  <p className="px-3 pb-1 pt-2 font-eyebrow text-[#6e7079]">{group.label}</p>
                  {group.items.map((item) => {
                    const index = options.findIndex((option) => option.key === item.key);
                    const Icon = item.icon;
                    return (
                      <button key={item.key} type="button" role="option" aria-selected={index === active} onMouseDown={(event) => event.preventDefault()} onClick={() => go(item.href)} onMouseEnter={() => setActive(index)} className={cx("flex h-[52px] w-full items-center gap-3 rounded-[10px] px-3 text-left", index === active ? "bg-[#e6ebf7]" : "")}>
                        <span className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-[8px]", index === active ? "bg-white" : "bg-[#f1f1ee]")}><Icon size={18} aria-hidden="true" /></span>
                        <span className="flex min-w-0 flex-1 flex-col"><span className={cx("truncate text-[16px] font-semibold leading-6", index === active ? "text-[#002fa7]" : "text-[#101115]")}>{item.title}</span><span className="truncate text-[14px] leading-5 text-[#6e7079]">{item.sub}</span></span>
                        {index === active && <span className="font-meta shrink-0 text-[#002fa7]">↵ Enter</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
            <p className="mt-1 border-t border-[#ecebe7] px-5 pt-2.5 font-meta text-[#6e7079]">↑ ↓ to move · Enter to select · Esc to close</p>
          </div>
        )}
      </div>
      <span className="mx-1 hidden h-10 w-px shrink-0 bg-[#dcdbd5] sm:block" aria-hidden="true" />
      <span className="mx-2 my-0.5 h-px bg-[#dcdbd5] sm:hidden" aria-hidden="true" />
      <label className="flex min-w-0 items-center gap-3 rounded-[14px] px-4 py-[10px] sm:w-[250px] sm:shrink-0">
        <MapPin size={22} className="shrink-0 text-[#101115]" aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span className="font-display text-[13px] font-medium leading-[18px] text-[#4a4c55]">Where</span>
          <select name="city" value={city} onChange={(event) => setCity(event.target.value)} className="w-full min-w-0 truncate bg-transparent text-[18px] leading-7 text-[#101115] outline-none">
            <option value="">All cities</option>
            {cities.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </span>
      </label>
      <Button type="primary" size="m" htmlType="submit" className="h-12 w-full sm:ml-1 sm:h-14 sm:w-auto" icon={<Search size={18} aria-hidden="true" />}>Search</Button>
    </form>
  );
}
