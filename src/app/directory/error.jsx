"use client";

import { CloudOff } from "lucide-react";
import SiteHeader from "@/components/ds/SiteHeader";
import { Button } from "@/components/ds";

// Directory "load failed" state.
export default function DirectoryError({ reset }) {
  return (
    <main className="min-h-screen bg-[#f1f1ee] text-[#101115]">
      <SiteHeader variant="compact" active="explore" />
      <div className="mx-auto flex max-w-[480px] flex-col items-center gap-3 px-4 py-24 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-[#b42318]"><CloudOff size={24} aria-hidden="true" /></span>
        <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.0294em]">We couldn’t load businesses</h1>
        <p className="text-[16px] leading-6 text-[#4a4c55]">Check your connection and try again. Your search and filters are kept.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3"><Button type="primary" onClick={() => reset()}>Try again</Button><Button type="secondary" href="/">Back to home</Button></div>
      </div>
    </main>
  );
}
