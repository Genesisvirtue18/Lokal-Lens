"use client";

import { useEffect, useState } from "react";

const MESSAGES = ["Finding local businesses…", "Checking what's open near you…", "Gathering photos and offers…", "Almost there…"];

// The full-screen loader: the Lokal Lens mark inside a turning ring, a bouncing row of dots and a message that changes every couple of seconds.
export default function PageLoader() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep((current) => Math.min(current + 1, MESSAGES.length - 1)), 2200);
    return () => clearInterval(timer);
  }, []);
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="fixed inset-0 grid place-items-center bg-[#f1f1ee]/95" style={{ zIndex: 2500 }}>
      <div className="flex flex-col items-center gap-5 px-6 text-center">
        <div className="relative grid h-[88px] w-[88px] place-items-center">
          <span className="absolute inset-0 rounded-full border-[3px] border-[#d6def2] border-t-[#002fa7]" aria-hidden="true" style={{ animation: "loader-spin 1s linear infinite", willChange: "transform" }} />
          <span className="relative inline-block h-11 w-11 rounded-full bg-[#002fa7]" aria-hidden="true" style={{ animation: "loader-breathe 1.6s ease-in-out infinite", willChange: "transform" }}>
            <span className="absolute left-[12px] top-[12px] h-5 w-5 rounded-full border-[4px] border-white" />
            <span className="absolute left-[26px] top-[8px] h-2.5 w-2.5 rounded-full bg-[#f4b8c8]" />
          </span>
        </div>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((dot) => <span key={dot} className="h-2 w-2 rounded-full bg-[#002fa7]" style={{ animation: "loader-dot 1.2s ease-in-out infinite", animationDelay: `${dot * 160}ms`, willChange: "transform, opacity" }} />)}
        </div>
        <p key={step} className="font-display text-[15px] font-medium text-[#101115]">{MESSAGES[step]}</p>
      </div>
    </div>
  );
}
