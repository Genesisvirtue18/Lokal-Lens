"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Plus, Sparkles } from "lucide-react";
import PinMap from "@/components/PinMap";
import { Button, Chip, cx } from "@/components/ds";
import BusinessCard from "@/components/ds/BusinessCard";
import { toDirectoryBusiness } from "@/lib/directory-data";

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000/api/v1")).replace(/\/$/, "");
const HISTORY_KEY = "lokal-lens-ask-history";
const FOLLOW_UPS = [["Only verified", { verified: "true" }], ["Open now", { openNow: "true" }], ["Top rated", { sort: "rating" }]];
const EXAMPLES = ["Best dentist near me", "Vegan bakery", "Diwali party venue", "Electrician for tonight"];

// Ask Lokal (preview). The answers come from the directory's own search, not from an AI model yet,
// so the page says so and never invents details about a business.
export default function AskLokal({ city = "", initialQuestion = "" }) {
  const [history, setHistory] = useState([]);
  const [thread, setThread] = useState([]); // [{ role: 'user'|'assistant', text, results? }]
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastQuestion, setLastQuestion] = useState("");
  const [active, setActive] = useState("");
  const [pinned, setPinned] = useState("");
  const scroller = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    // Browser-only storage can only be read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]")); } catch { /* no saved questions */ }
  }, []);
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [thread, busy]);

  async function ask(question, filters = {}) {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true); setDraft(""); setLastQuestion(text); setActive(text);
    setThread((current) => [...current, { role: "user", text }]);
    try {
      const params = new URLSearchParams({ q: text, limit: "4", ...(city ? { city } : {}), ...filters });
      const response = await fetch(`${apiUrl}/businesses?${params}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Search failed");
      const results = (body.data?.items || []).map(toDirectoryBusiness);
      const total = Number(body.data?.pagination?.totalItems) || results.length;
      setThread((current) => [...current, results.length
        ? { role: "assistant", text: `I found ${total} ${total === 1 ? "business" : "businesses"} for “${text}”${city ? ` in ${city}` : ""}. Here ${results.length === 1 ? "is the best match" : `are the top ${results.length}`}.`, results }
        : { role: "assistant", text: `I couldn’t find a business for “${text}”${city ? ` in ${city}` : ""}. Try different words, or remove a filter.` }]);
      setHistory((current) => { const next = [text, ...current.filter((item) => item !== text)].slice(0, 8); try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* history not saved */ } return next; });
    } catch {
      setThread((current) => [...current, { role: "assistant", text: "Something went wrong while searching. Please try again." }]);
    } finally { setBusy(false); }
  }

  useEffect(() => {
    if (initialQuestion && !started.current) { started.current = true; ask(initialQuestion); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latestResults = [...thread].reverse().find((message) => message.results?.length)?.results || [];
  const newQuestion = () => { setThread([]); setLastQuestion(""); setActive(""); setPinned(""); setDraft(""); };

  return (
    <section className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-[1440px] gap-6 px-4 pb-12 pt-6 md:px-8 lg:h-[calc(100vh-80px)] lg:min-h-[680px] lg:grid-cols-[220px_minmax(0,1fr)] lg:px-12 xl:grid-cols-[220px_minmax(0,1fr)_minmax(0,400px)] xl:px-[72px]">
      <aside className="hidden flex-col gap-2 overflow-y-auto rounded-[20px] border border-[#dcdbd5] bg-white p-4 lg:flex">
        <Button type="secondary" size="s" onClick={newQuestion} icon={<Plus size={18} aria-hidden="true" />}>New question</Button>
        <p className="mt-3 font-eyebrow text-[#6e7079]">Recent</p>
        {history.length ? history.map((item) => (
          <button key={item} type="button" onClick={() => ask(item)} className={cx("min-h-11 truncate rounded-[8px] px-2.5 text-left text-[14px] leading-5", active === item ? "bg-[#e6ebf7] text-[#002fa7]" : "hover:bg-[#f1f1ee]")}>{item}</button>
        )) : <p className="px-1 text-[14px] leading-5 text-[#6e7079]">Your questions will appear here on this device.</p>}
      </aside>

      <div className="flex min-h-[560px] min-w-0 flex-col gap-4 rounded-[20px] border border-[#dcdbd5] bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 border-b border-[#ecebe7] pb-3"><p className="flex items-center gap-2 font-display text-[16px] font-semibold"><Sparkles size={18} className="text-[#002fa7]" aria-hidden="true" />Ask Lokal<span className="rounded-full bg-[#fbe6ec] px-2 py-0.5 font-eyebrow text-[10px] text-[#101115]">Preview</span></p>{city && <p className="text-[14px] text-[#4a4c55]">Searching in <strong className="text-[#101115]">{city}</strong></p>}</div>
        <div ref={scroller} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1" aria-live="polite">
          {thread.length === 0 && (
            <div className="my-auto flex flex-col items-center gap-3 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-[#e6ebf7] text-[#002fa7]"><Sparkles size={24} aria-hidden="true" /></span>
              <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.0294em]">Ask Lokal</h1>
              <p className="max-w-[420px] text-[16px] leading-6 text-[#4a4c55]">Describe what you need in your own words{city ? ` — I’ll look in ${city}` : ""}.</p>
              <div className="flex flex-wrap justify-center gap-2">{EXAMPLES.map((example) => <Chip key={example} onClick={() => ask(example)}>{example}</Chip>)}</div>
            </div>
          )}
          {thread.map((message, index) => message.role === "user" ? (
            <div key={index} className="flex justify-end"><p className="max-w-[80%] rounded-[16px] rounded-br-[4px] bg-[#002fa7] px-4 py-3 text-[16px] leading-6 text-white">{message.text}</p></div>
          ) : (
            <div key={index} className="flex flex-col gap-3">
              <p className="max-w-[86%] rounded-[16px] rounded-bl-[4px] bg-[#f1f1ee] px-4 py-3 text-[16px] leading-6">{message.text}</p>
              {message.results?.length > 0 && <div className="flex flex-col gap-2.5">{message.results.map((business) => { const id = String(business._id || business.id || business.slug || business.name); return <div key={id} onMouseEnter={() => setPinned(id)} onMouseLeave={() => setPinned("")}><BusinessCard business={business} layout="compact" selected={pinned === id} /></div>; })}</div>}
            </div>
          ))}
          {busy && <p className="w-fit rounded-[16px] rounded-bl-[4px] bg-[#f1f1ee] px-4 py-3 text-[16px] leading-6 text-[#6e7079]">Looking…</p>}
        </div>

        {lastQuestion && !busy && (
          <div className="flex flex-wrap gap-2">{FOLLOW_UPS.map(([label, filters]) => <Chip key={label} onClick={() => ask(lastQuestion, filters)}>{label}</Chip>)}</div>
        )}
        <form onSubmit={(event) => { event.preventDefault(); ask(draft); }} className="flex h-14 items-center gap-2.5 rounded-[16px] border-2 border-[#002fa7] bg-white pl-3.5 pr-1.5 shadow-[0_1px_2px_rgba(16,17,21,.04),0_8px_24px_rgba(16,17,21,.06)]">
          <Sparkles size={20} className="shrink-0 text-[#002fa7]" aria-hidden="true" />
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask for a business or service…" aria-label="Ask Lokal" maxLength={200} className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[#6e7079]" />
          <button type="submit" disabled={busy || !draft.trim()} aria-label="Send" className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[#002fa7] text-white transition-colors hover:bg-[#00248a] disabled:bg-[#e4e3de] disabled:text-[#9a9ba1]"><ArrowUp size={20} aria-hidden="true" /></button>
        </form>
        <p className="text-[14px] leading-5 text-[#6e7079]">Preview: results come from Lokal Lens directory search, not an AI model yet. Check details with the business.</p>
      </div>

      <div className="hidden xl:block"><PinMap businesses={latestResults} activeId={pinned} onSelect={setPinned} emptyText="Ask for a business and its location will show here." /></div>
    </section>
  );
}
