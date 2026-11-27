"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Check, Star } from "lucide-react";
import CityField from "@/components/CityField";
import { Button, cx } from "@/components/ds";
import { businessDetailPath } from "@/lib/directory-data";

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000/api/v1")).replace(/\/$/, "");
const control = "h-12 w-full rounded-[10px] border border-[#bdbcb5] bg-white px-3.5 text-[16px] text-[#101115] outline-none placeholder:text-[#6e7079] hover:border-[#101115] focus:border-2 focus:border-[#002fa7] focus:px-[13px]";
const labelClass = "font-display text-[14px] font-medium leading-5 text-[#101115]";
const card = "flex flex-col gap-4 rounded-[16px] border border-[#dcdbd5] bg-white p-5 sm:p-6";

// "Get quotes": what you need and where → pick up to five businesses → your details → send. Only the picked businesses receive it.
export default function QuoteForm({ categories = [], cities = [], defaultCategory = "", defaultCity = "" }) {
  const [category, setCategory] = useState(defaultCategory);
  const [city, setCity] = useState(defaultCity);
  const [service, setService] = useState("");
  const [result, setResult] = useState({ key: "", items: [], limit: 5, failed: false });
  const [picked, setPicked] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState(null);
  const inFlight = useRef(false);

  const flat = categories.flatMap((root) => [root, ...(root.children || [])]);
  const chosenCategory = flat.find((item) => item.slug === category);
  const parent = categories.find((root) => root.children?.some((child) => child.slug === category));
  const services = [...new Set([...(chosenCategory?.services || []), ...(parent?.services || [])])];
  const ready = Boolean(category && city.trim().length >= 2);
  const key = ready ? `${category}|${city.trim().toLowerCase()}|${service}` : "";
  const current = result.key === key ? result : null;

  useEffect(() => {
    if (!key) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ category, city: city.trim(), ...(service ? { service } : {}) });
        const token = localStorage.getItem("directflow_access_token");
        const response = await fetch(`${apiUrl}/quotes/matches?${params}`, { signal: controller.signal, headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message);
        const items = body.data?.items || [];
        setResult({ key, items, limit: body.data?.limit || 5, failed: false });
        setPicked(items.slice(0, 3).map((item) => item._id));
      } catch (reason) { if (reason.name !== "AbortError") setResult({ key, items: [], limit: 5, failed: true }); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key, category, city, service]);

  const limit = current?.limit || 5;
  const selected = current ? picked.filter((id) => current.items.some((item) => item._id === id)) : [];
  const toggle = (id) => setPicked((list) => (list.includes(id) ? list.filter((item) => item !== id) : list.length < limit ? [...list, id] : list));

  async function submit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = new FormData(event.currentTarget);
    if (!selected.length) { setError("Choose at least one business."); return; }
    inFlight.current = true; setSending(true); setError("");
    try {
      const token = localStorage.getItem("directflow_access_token");
      const response = await fetch(`${apiUrl}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ category, city: city.trim(), ...(service ? { service } : {}), name: form.get("name"), phone: form.get("phone"), email: form.get("email") || "", message: form.get("message"), businessIds: selected, consent: form.get("consent") === "on" }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.errors?.[0]?.message || body.message || "Unable to send your request.");
      setSentTo(body.data?.sentTo || []);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (reason) { setError(reason.message === "Failed to fetch" ? "We couldn’t reach the server. Check your connection and try again." : reason.message); }
    finally { inFlight.current = false; setSending(false); }
  }

  if (sentTo) {
    return (
      <div className={card} role="status">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e7f4e5] text-[#2b7a26]"><Check size={24} aria-hidden="true" /></span>
        <h2 className="text-[22px] font-semibold leading-7">Request sent to {sentTo.length} {sentTo.length === 1 ? "business" : "businesses"}</h2>
        <ul className="flex flex-col gap-1.5 text-[15px]">{sentTo.map((item) => <li key={item._id} className="font-medium">{item.name}</li>)}</ul>
        <p className="text-[14px] leading-5 text-[#4a4c55]">They can now call you or reply. Lokal Lens doesn’t take payments or promise a price.</p>
        <div className="flex flex-wrap gap-3"><Button type="primary" size="s" href="/directory">Browse businesses</Button><Button type="secondary" size="s" onClick={() => { setSentTo(null); setPicked([]); setResult({ key: "", items: [], limit: 5, failed: false }); setService(""); }}>Send another request</Button></div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className={card}>
        <h2 className="font-display text-[16px] font-semibold">1. What do you need?</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5"><span className={labelClass}>Category</span>
            <select value={category} onChange={(event) => { setCategory(event.target.value); setService(""); }} required className={control}>
              <option value="">Choose a category</option>
              {categories.map((root) => (root.children?.length
                ? <optgroup key={root._id} label={root.name}><option value={root.slug}>{root.name} (any)</option>{root.children.map((child) => <option key={child._id} value={child.slug}>{child.name}</option>)}</optgroup>
                : <option key={root._id} value={root.slug}>{root.name}</option>))}
            </select>
          </label>
          <div className="flex flex-col gap-1.5"><span className={labelClass}>City</span>
            <CityField name="city" defaultValue={defaultCity} cities={cities} onValueChange={setCity} placeholder="e.g. Noida" align="left" className="h-12 w-full rounded-[10px] border border-[#bdbcb5] bg-white px-3.5 focus-within:border-[#002fa7]" inputClassName="text-[16px] text-[#101115]" />
          </div>
          {services.length > 0 && <label className="flex flex-col gap-1.5 sm:col-span-2"><span className={labelClass}>Service <span className="font-normal text-[#6e7079]">(optional)</span></span><select value={service} onChange={(event) => setService(event.target.value)} className={control}><option value="">Any service</option>{services.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>}
        </div>
      </div>

      <div className={card} aria-live="polite">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-display text-[16px] font-semibold">2. Who should receive it?</h2>{current?.items.length ? <p className="text-[13px] text-[#4a4c55]">{selected.length} of {limit} chosen</p> : null}</div>
        {!ready && <p className="text-[14px] text-[#4a4c55]">Choose a category and a city to see businesses.</p>}
        {ready && !current && <p className="text-[14px] text-[#4a4c55]">Finding businesses…</p>}
        {current?.failed && <p role="alert" className="text-[14px] text-[#b42318]">We couldn’t load the list. Check your connection and change the city or category to try again.</p>}
        {current && !current.failed && !current.items.length && <p className="text-[14px] leading-5 text-[#4a4c55]">No business in this category and city can receive requests yet. <Link href={`/directory?category=${encodeURIComponent(category)}&city=${encodeURIComponent(city.trim())}`} className="font-medium text-[#002fa7] underline">Browse listings</Link> and contact one directly.</p>}
        {current?.items.length > 0 && <ul className="flex flex-col gap-2.5">{current.items.map((item) => {
          const on = selected.includes(item._id);
          return (
            <li key={item._id} className={cx("flex items-center gap-3 rounded-[12px] border p-3", on ? "border-[#002fa7] bg-[#f3f6fd]" : "border-[#dcdbd5] bg-white")}>
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                <input type="checkbox" checked={on} disabled={!on && selected.length >= limit} onChange={() => toggle(item._id)} className="h-5 w-5 shrink-0 accent-[#002fa7]" />
                <span className="min-w-0">
                  <span className="flex items-center gap-1 font-display text-[15px] font-semibold leading-5"><span className="truncate">{item.name}</span>{item.verified && <BadgeCheck size={16} className="shrink-0 text-[#2b7a26]" aria-label="Verified business" />}</span>
                  <span className="flex flex-wrap items-center gap-x-2 text-[13px] leading-[18px] text-[#4a4c55]">{[item.locality, item.city].filter(Boolean).join(", ")}{item.reviewCount ? <span className="inline-flex items-center gap-1"><Star size={13} className="fill-[#f5a623] text-[#f5a623]" aria-hidden="true" />{Number(item.averageRating).toFixed(1)} ({item.reviewCount})</span> : null}{item.offersService ? <span className="text-[#2b7a26]">Offers this service</span> : null}</span>
                </span>
              </label>
              <Link href={businessDetailPath(item)} target="_blank" className="shrink-0 font-display text-[13px] font-medium text-[#002fa7] hover:underline">View</Link>
            </li>
          );
        })}</ul>}
      </div>

      <div className={card}>
        <h2 className="font-display text-[16px] font-semibold">3. Your details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5"><span className={labelClass}>Your name</span><input name="name" required minLength={2} maxLength={120} autoComplete="name" placeholder="Full name" className={control} /></label>
          <label className="flex flex-col gap-1.5"><span className={labelClass}>Mobile number</span><input name="phone" required type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} title="10-digit mobile number" autoComplete="tel-national" placeholder="10-digit mobile number" onInput={(event) => { event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 10); }} className={control} /></label>
          <label className="flex flex-col gap-1.5 sm:col-span-2"><span className={labelClass}>Email <span className="font-normal text-[#6e7079]">(optional)</span></span><input name="email" type="email" maxLength={254} autoComplete="email" placeholder="you@example.com" className={control} /></label>
          <label className="flex flex-col gap-1.5 sm:col-span-2"><span className={labelClass}>What do you need?</span><textarea name="message" required minLength={5} maxLength={2000} rows={4} placeholder="e.g. Split AC is not cooling. I need a visit this week." className="w-full rounded-[10px] border border-[#bdbcb5] bg-white px-3.5 py-3 text-[16px] leading-6 outline-none placeholder:text-[#6e7079] hover:border-[#101115] focus:border-2 focus:border-[#002fa7] focus:px-[13px]" /></label>
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-5"><input type="checkbox" name="consent" required className="mt-0.5 h-5 w-5 shrink-0 accent-[#002fa7]" /><span>I agree to share my name, number and message with the {selected.length || "chosen"} {selected.length === 1 ? "business" : "businesses"} above, so they can contact me.</span></label>
        {error && <p role="alert" className="rounded-[10px] bg-[#fbe9e7] px-3 py-2 text-[14px] text-[#b3261e]">{error}</p>}
        <div><Button type="primary" htmlType="submit" disabled={sending || !selected.length} className="w-full sm:w-auto">{sending ? "Sending…" : selected.length ? `Send to ${selected.length} ${selected.length === 1 ? "business" : "businesses"}` : "Send request"}</Button></div>
      </div>
    </form>
  );
}
