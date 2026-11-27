"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

/**
 * Choose one area from the neighbourhoods that actually have businesses (with how many each has), instead of typing a name.
 * Shows a search box when the list is long. The chosen area is sent with the form as `locality`; "All areas" sends nothing.
 */
export default function AreaPicker({ options = [], selected = "", name = "locality" }) {
  const [term, setTerm] = useState("");
  const [value, setValue] = useState(selected);
  const shown = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return needle ? options.filter((item) => item.name.toLowerCase().includes(needle)) : options;
  }, [options, term]);

  if (!options.length) return <p className="px-2 py-3 text-[14px] leading-5 text-[#6e7079]">Areas appear here as soon as businesses are listed in this city.</p>;

  const row = (label, optionValue, count) => (
    <label key={label} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] px-2 text-[15px] leading-6 hover:bg-[#f7f7f4]">
      <input type="radio" name={name} value={optionValue} checked={value === optionValue} onChange={() => setValue(optionValue)} className="h-[18px] w-[18px] shrink-0 cursor-pointer accent-[#002fa7]" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count ? <span className="shrink-0 text-[13px] text-[#6e7079]">{count}</span> : null}
    </label>
  );

  return (
    <div className="flex flex-col gap-1">
      {options.length > 6 && (
        <div className="mb-1 flex h-11 items-center gap-2 rounded-[10px] border border-[#bdbcb5] bg-white px-3 focus-within:border-[#002fa7] focus-within:ring-2 focus-within:ring-[#002fa7]/20">
          <Search size={16} className="shrink-0 text-[#6e7079]" aria-hidden="true" />
          <input value={term} onChange={(event) => setTerm(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} placeholder="Search area" aria-label="Search area" autoComplete="off" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#6e7079]" />
        </div>
      )}
      <div className="flex max-h-[240px] flex-col gap-0.5 overflow-y-auto">
        {!term.trim() && row("All areas", "", 0)}
        {shown.map((item) => row(item.name, item.name, item.count))}
        {term.trim() && shown.length === 0 && <p className="px-2 py-3 text-[14px] text-[#6e7079]">No area matches “{term.trim()}”.</p>}
      </div>
    </div>
  );
}
