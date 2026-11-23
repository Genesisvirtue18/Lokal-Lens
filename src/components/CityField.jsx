"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cx } from "@/components/ds";

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000/api/v1")).replace(/\/$/, "");

// The list of cities that have published businesses is fetched once per visit and shared by every city box on the page.
let loadedCities;
function loadCities() {
  loadedCities ??= fetch(`${apiUrl}/locations/business-cities`)
    .then((response) => (response.ok ? response.json() : null))
    .then((body) => (body?.data?.items || []).map((item) => ({ name: item.name, count: item.count })))
    .catch(() => { loadedCities = undefined; return []; });
  return loadedCities;
}

/**
 * A city box that is both a text field and a dropdown: it shows the cities that have listings, narrows them as you type,
 * and fills the box when one is chosen. It still submits as a normal form field named `name`, so it works inside a plain GET form.
 */
export default function CityField({ cities = [], name = "city", defaultValue = "", onValueChange, placeholder = "City", className = "", inputClassName = "", align = "right", allLabel = "All cities", width }) {
  const listId = useId();
  const box = useRef(null);
  const [value, setValue] = useState(defaultValue);
  const [typed, setTyped] = useState("");      // what the person typed in the city box itself
  const [filter, setFilter] = useState("");    // what the person typed in the search field inside the dropdown
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [fetched, setFetched] = useState([]);

  const given = useMemo(() => cities.map((city) => (typeof city === "string" ? { name: city } : city)).filter((city) => city?.name), [cities]);
  useEffect(() => { if (!given.length) { let live = true; loadCities().then((rows) => { if (live) setFetched(rows); }); return () => { live = false; }; } return undefined; }, [given.length]);
  const all = given.length ? given : fetched;

  const term = (filter || typed).trim().toLowerCase();
  const visible = useMemo(() => {
    if (!term) return all;
    // Cities that start with what was typed come first, then the ones that only contain it.
    const rank = (name) => (name.toLowerCase().startsWith(term) ? 0 : 1);
    return all.filter((city) => city.name.toLowerCase().includes(term)).sort((a, b) => rank(a.name) - rank(b.name));
  }, [all, term]);
  const options = useMemo(() => [{ name: "", label: allLabel }, ...visible.map((city) => ({ ...city, label: city.name }))], [visible, allLabel]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (box.current && !box.current.contains(event.target)) settle(); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value, all]);

  function commit(next) { setValue(next); setTyped(""); setFilter(""); setOpen(false); setActive(-1); onValueChange?.(next); }
  // Leaving the box: text that is exactly a city (any capitals) becomes that city; a single match is taken; anything else stays as typed.
  function settle() {
    const term = value.trim().toLowerCase();
    if (term && all.length) {
      const exact = all.find((city) => city.name.toLowerCase() === term);
      const only = !exact && visible.length === 1 ? visible[0] : null;
      const pick = exact || only;
      if (pick && pick.name !== value) { commit(pick.name); return; }
    }
    setTyped(""); setFilter(""); setOpen(false); setActive(-1);
  }

  function onKeyDown(event) {
    if (event.key === "Escape") { setOpen(false); setTyped(""); setFilter(""); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((index) => (index + 1) % options.length); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActive((index) => (index <= 0 ? options.length - 1 : index - 1)); }
    else if (event.key === "Enter" && open && active >= 0) { event.preventDefault(); commit(options[active].name); }
    else if (event.key === "Tab") settle();
  }

  return (
    <div ref={box} className={cx("relative flex min-w-0 items-center", width && "flex-none", className)} style={width ? { width } : undefined}>
      <input
        name={name} value={value} autoComplete="off" placeholder={placeholder} aria-label="City"
        role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(event) => { setValue(event.target.value); setTyped(event.target.value); setOpen(true); setActive(-1); onValueChange?.(event.target.value); }}
        onFocus={() => setOpen(true)} onKeyDown={onKeyDown}
        style={{ height: 24, lineHeight: "24px", padding: 0 }} className={cx("min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#6e7079]", inputClassName)}
      />
      <button type="button" tabIndex={-1} aria-label="Show cities" onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen((current) => !current)} className="shrink-0 text-[#6e7079] hover:text-[#101115]"><ChevronDown size={16} aria-hidden="true" className={cx("transition-transform", open && "rotate-180")} /></button>
      {open && (
        <div className={cx("absolute top-full z-50 mt-3 flex max-h-[360px] w-[280px] flex-col overflow-hidden rounded-[14px] border border-[#dcdbd5] bg-white shadow-[0_12px_32px_rgba(16,17,21,.14)]", align === "right" ? "right-0" : "left-0")}>
          <div className="flex shrink-0 items-center gap-2 border-b border-[#ecebe7] px-3 py-2.5">
            <Search size={16} className="shrink-0 text-[#6e7079]" aria-hidden="true" />
            <input value={filter} onChange={(event) => { setFilter(event.target.value); setActive(-1); }} onKeyDown={onKeyDown} autoComplete="off" placeholder="Search city" aria-label="Search city" className="min-w-0 flex-1 bg-transparent text-[15px] leading-6 text-[#101115] outline-none placeholder:text-[#6e7079]" />
            {filter && <button type="button" aria-label="Clear search" onClick={() => setFilter("")} className="shrink-0 text-[#6e7079] hover:text-[#101115]"><X size={14} aria-hidden="true" /></button>}
          </div>
          <ul id={listId} role="listbox" className="min-h-0 flex-1 overflow-y-auto py-1.5">
            {options.map((option, index) => {
              const selected = option.name.toLowerCase() === value.trim().toLowerCase();
              return (
                <li key={option.name || "all"} id={`${listId}-${index}`} role="option" aria-selected={selected} onMouseDown={(event) => event.preventDefault()} onClick={() => commit(option.name)} onMouseEnter={() => setActive(index)}
                  className={cx("flex h-10 cursor-pointer items-center gap-2 px-4 text-[15px] leading-5", index === active ? "bg-[#e6ebf7] text-[#002fa7]" : "text-[#101115]", !option.name && "font-medium")}>
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {option.count ? <span className="shrink-0 text-[13px] text-[#6e7079]">{option.count}</span> : null}
                  {selected && option.name ? <Check size={16} className="shrink-0 text-[#002fa7]" aria-hidden="true" /> : null}
                </li>
              );
            })}
            {term && visible.length === 0 && all.length > 0 && <li className="px-4 py-2.5 text-[14px] text-[#6e7079]" role="presentation">No city matches “{(filter || typed).trim()}”</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
