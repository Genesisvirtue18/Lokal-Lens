"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cx } from "@/components/ds";

/** Every category and subcategory as one list; each knows its main category. */
export function flatCategories(tree) {
  return tree.flatMap((root) => [
    { id: root._id, rootId: root._id, subId: "", name: root.name, parent: "", services: root.services || [] },
    ...(root.children || []).map((child) => ({ id: child._id, rootId: root._id, subId: child._id, name: child.name, parent: root.name, services: child.services || [] })),
  ]);
}

// A search box over hundreds of categories. It matches the category's name first, then its main category, then its services,
// so typing "root canal" finds Dentists.
export default function CategoryPicker({ categories, exclude = [], onSelect, placeholder = "Search categories", id, invalid, onBlur, label = "Search categories" }) {
  const listId = useId();
  const box = useRef(null);
  const list = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const all = useMemo(() => flatCategories(categories), [categories]);

  const matches = useMemo(() => {
    const free = all.filter((item) => !exclude.includes(item.id));
    const term = query.trim().toLowerCase();
    if (!term) return free;
    const score = (item) => {
      const name = item.name.toLowerCase();
      if (name.startsWith(term)) return 0;
      if (name.split(/[\s&/]+/).some((word) => word.startsWith(term))) return 1;
      if (name.includes(term)) return 2;
      if (item.services.some((service) => service.toLowerCase().includes(term))) return 3;
      if (item.parent.toLowerCase().includes(term)) return 4;
      return -1;
    };
    return free.map((item) => ({ item, rank: score(item) })).filter((row) => row.rank >= 0).sort((a, b) => a.rank - b.rank || a.item.name.localeCompare(b.item.name)).map((row) => row.item);
  }, [all, exclude, query]);
  const shown = matches.slice(0, 60);
  const term = query.trim().toLowerCase();

  useEffect(() => {
    const close = (event) => { if (box.current && !box.current.contains(event.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  useEffect(() => { list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" }); }, [active]);

  const choose = (item) => { setQuery(""); setOpen(false); setActive(0); onSelect(item); };
  function onKeyDown(event) {
    if (event.key === "Escape") { setOpen(false); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((value) => Math.min(shown.length - 1, value + 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(0, value - 1)); }
    else if (event.key === "Enter") { event.preventDefault(); if (open && shown[active]) choose(shown[active]); }
  }

  return (
    <div ref={box} className="relative" onBlur={(event) => { if (!box.current.contains(event.relatedTarget)) { setOpen(false); onBlur?.(); } }}>
      <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6e7079]" aria-hidden="true" />
      <input
        id={id} value={query} autoComplete="off" role="combobox" aria-label={label} aria-invalid={invalid} aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={open && shown[active] ? `${listId}-${active}` : undefined}
        onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true); }} onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={cx("h-12 w-full rounded-[10px] border bg-white pl-11 pr-3.5 text-[16px] text-[#101115] outline-none placeholder:text-[#6e7079] focus:border-2 focus:border-[#002fa7]", invalid ? "border-[#b42318]" : "border-[#bdbcb5] hover:border-[#101115]")}
      />
      {open && (
        <div ref={list} id={listId} role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-[320px] overflow-y-auto rounded-[12px] border border-[#dcdbd5] bg-white py-1 shadow-[0_12px_32px_rgba(16,17,21,.14)]">
          {shown.map((item, index) => (
            <button key={item.id} id={`${listId}-${index}`} data-index={index} type="button" role="option" aria-selected={index === active} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(item)} onMouseEnter={() => setActive(index)} className={cx("flex w-full flex-col items-start px-3.5 py-2 text-left", index === active ? "bg-[#e6ebf7]" : "")}>
              <span className={cx("font-display text-[14px] leading-5", item.parent ? "font-medium" : "font-semibold")}>{item.name}</span>
              <span className="text-[12px] leading-4 text-[#6e7079]">{item.parent || "Main category"}{term && !item.name.toLowerCase().includes(term) ? ` · ${item.services.find((service) => service.toLowerCase().includes(term)) || ""}` : ""}</span>
            </button>
          ))}
          {!shown.length && <p className="px-3.5 py-3 text-[14px] text-[#4a4c55]">Nothing matches “{query.trim()}”. Try a shorter word, or choose the closest main category.</p>}
          {matches.length > shown.length && <p className="px-3.5 py-2 text-[12px] text-[#6e7079]">{matches.length - shown.length} more. Type to narrow the list.</p>}
        </div>
      )}
    </div>
  );
}
