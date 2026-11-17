"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

// Figma "Section / Services": one bordered list, each row has the service name and its price (or "Contact for pricing").
// A service may be a plain string or { name, description, price }.
function normalise(service) {
  if (typeof service === "string") return { name: service };
  return { name: service?.name || "", description: service?.description || "", price: service?.price ?? service?.priceFrom, priceTo: service?.priceTo, unit: service?.unit };
}
const money = (value) => `₹${Number(value).toLocaleString("en-IN")}`;

export default function BusinessServices({ services = [] }) {
  const [query, setQuery] = useState("");
  const list = useMemo(() => services.map(normalise).filter((item) => item.name), [services]);
  const filtered = useMemo(() => list.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase())), [list, query]);

  return (
    <section id="services" className="flex scroll-mt-32 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="font-eyebrow text-[#6e7079]">Services</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.0208em]">Menu &amp; services</h2>
          {list.length > 6 && (
            <label className="flex h-11 w-full items-center gap-2 rounded-[10px] border border-[#bdbcb5] bg-white px-3 sm:w-64"><Search size={18} className="shrink-0 text-[#4a4c55]" aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search services" aria-label="Search services" className="w-full bg-transparent text-[14px] outline-none placeholder:text-[#6e7079]" /></label>
          )}
        </div>
      </div>
      {list.length ? (
        <div className="overflow-hidden rounded-[16px] border border-[#dcdbd5] bg-white">
          {filtered.map((item, index) => (
            <div key={item.name} className={`flex items-center gap-6 px-6 py-[18px] ${index ? "border-t border-[#dcdbd5]" : ""}`}>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h3 className="font-display text-[16px] font-semibold leading-6">{item.name}</h3>
                {item.description && <p className="line-clamp-2 text-[14px] leading-5 text-[#4a4c55]">{item.description}</p>}
              </div>
              {item.price ? <span className="shrink-0 font-mono text-[14px] leading-5">{item.priceTo ? `${money(item.price)} – ${money(item.priceTo)}` : money(item.price)}{item.unit ? ` / ${item.unit}` : ""}</span> : <a href="#contact" className="shrink-0 font-display text-[13px] font-medium leading-[18px] text-[#002fa7] hover:underline">Contact for pricing</a>}
            </div>
          ))}
          {!filtered.length && <p className="px-6 py-8 text-center text-[14px] text-[#4a4c55]">No services match your search.</p>}
        </div>
      ) : <p className="rounded-[16px] border border-[#dcdbd5] bg-white px-6 py-8 text-center text-[14px] text-[#4a4c55]">No services listed yet.</p>}
      {list.length > 0 && <p className="text-[14px] leading-5 text-[#6e7079]">Prices are provided by the business and may change. Lokal Lens doesn’t process payments.</p>}
    </section>
  );
}
