"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { Heart } from "lucide-react";
import SiteHeader from "@/components/ds/SiteHeader";
import SiteFooter from "@/components/ds/SiteFooter";
import BusinessCard from "@/components/ds/BusinessCard";
import { Button, Eyebrow } from "@/components/ds";
import { SAVED_BUSINESSES_KEY, subscribeSaved } from "@/components/BusinessProfileActions";

let previousSnapshot = null;
let cachedBusinesses = [];
const emptyServerSnapshot = [];
function getSavedSnapshot() {
  const raw = localStorage.getItem(SAVED_BUSINESSES_KEY);
  if (raw !== previousSnapshot) {
    previousSnapshot = raw;
    try { cachedBusinesses = JSON.parse(raw || "[]").filter((item) => item && item.id); }
    catch { cachedBusinesses = []; }
  }
  return cachedBusinesses;
}

export default function SavedBusinessesPage() {
  const saved = useSyncExternalStore(subscribeSaved, getSavedSnapshot, () => emptyServerSnapshot);
  const ordered = useMemo(() => [...saved].reverse(), [saved]);

  return (
    <main className="min-h-screen bg-[#f1f1ee] text-[#101115]">
      <SiteHeader variant="desktop" active="saved" />
      <section className="mx-auto min-h-[calc(100vh-420px)] max-w-[1440px] px-4 pb-20 pt-10 md:px-8 lg:px-[72px] lg:pt-14">
        {ordered.length === 0 ? (
          <div className="mx-auto mt-6 flex max-w-[420px] flex-col items-center gap-3 rounded-[16px] border border-[#dcdbd5] bg-white px-6 py-8 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[#f1f1ee] text-[#002fa7]"><Heart size={24} aria-hidden="true" /></span>
            <h1 className="text-[24px] font-semibold leading-8 tracking-[-0.02em]">You haven’t saved any businesses yet</h1>
            <p className="text-[16px] leading-6 text-[#4a4c55]">Tap the heart on any listing to keep it here for later.</p>
            <div className="mt-2"><Button type="primary" href="/directory">Explore businesses</Button></div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-col gap-3">
                <Eyebrow>Saved · {saved.length}</Eyebrow>
                <h1 className="text-[32px] font-semibold leading-10 tracking-[-0.0341em] md:text-[44px] md:leading-[52px]">Saved businesses</h1>
                <p className="text-[16px] leading-6 text-[#4a4c55]">Saved on this device. <Link href="/login" className="font-medium text-[#002fa7] hover:underline">Sign in to keep them across devices.</Link></p>
              </div>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {ordered.map((business) => <BusinessCard key={business.id} business={{ ...business, _id: business.id }} layout="grid" />)}
            </div>
          </>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
