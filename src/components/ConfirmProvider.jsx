"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ShieldAlert, Trash2 } from "lucide-react";

const ConfirmContext = createContext(null);
const TONES = {
  danger: { icon: Trash2, tile: "bg-[#fdecea] text-[#b42318]", button: "bg-[#b42318] hover:bg-[#9a1d14] focus-visible:ring-[#b42318]/40" },
  warning: { icon: ShieldAlert, tile: "bg-[#fbf0d9] text-[#8a5a00]", button: "bg-[#8a5a00] hover:bg-[#744b00] focus-visible:ring-[#8a5a00]/40" },
  primary: { icon: AlertTriangle, tile: "bg-[#e6ebf7] text-[#002fa7]", button: "bg-[#002fa7] hover:bg-[#00248a] focus-visible:ring-[#002fa7]/40" },
};

/**
 * One confirmation dialog for the whole app, used instead of the browser's plain pop-ups.
 *   const confirm = useConfirm();
 *   if (await confirm({ title: "Delete 3 listings?", message: "…", confirmLabel: "Delete", tone: "danger", requireText: "DELETE" })) { … }
 */
export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const resolver = useRef(null);
  const opener = useRef(null);
  const cancelRef = useRef(null);
  const inputRef = useRef(null);
  const confirmRef = useRef(null);

  const ask = useCallback((options) => new Promise((resolve) => {
    opener.current = typeof document === "undefined" ? null : document.activeElement;
    resolver.current = resolve;
    setTyped(""); setPassword("");
    setRequest(options);
  }), []);

  const close = useCallback((answer) => {
    resolver.current?.(answer);
    resolver.current = null;
    setRequest(null);
    const back = opener.current;
    if (back && typeof back.focus === "function") setTimeout(() => back.focus(), 0);
  }, []);

  useEffect(() => {
    if (!request) return undefined;
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    // Risky actions start on Cancel (or on the typing box), so a stray Enter never confirms them.
    setTimeout(() => (request.requireText || request.askCode ? inputRef.current : request.tone === "primary" ? confirmRef.current : cancelRef.current)?.focus(), 0);
    return () => { document.body.style.overflow = previous; };
  }, [request]);

  const tone = TONES[request?.tone] || TONES.primary;
  const Icon = tone.icon;
  const ready = (!request?.requireText || typed.trim() === request.requireText) && (!request?.askCode || password.trim().length >= 6);
  const answer = () => (request?.askCode ? password.trim() : true);

  function onKeyDown(event) {
    if (event.key === "Escape") { event.stopPropagation(); close(false); return; }
    if (event.key !== "Tab") return;
    const items = [...event.currentTarget.querySelectorAll("button:not([disabled]), input")];
    if (!items.length) return;
    const first = items[0]; const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  const value = useMemo(() => ask, [ask]);
  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {request && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-[#101115]/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) close(false); }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message" onKeyDown={onKeyDown} className="flex w-full max-w-[460px] flex-col gap-5 rounded-[20px] bg-white p-6 shadow-[0_24px_64px_rgba(16,17,21,.28)]">
            <div className="flex items-start gap-4">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${tone.tile}`}><Icon size={22} aria-hidden="true" /></span>
              <div className="min-w-0">
                <h2 id="confirm-title" className="font-display text-[20px] font-semibold leading-7 text-[#101115]">{request.title}</h2>
                <p id="confirm-message" className="mt-1 whitespace-pre-line text-[15px] leading-6 text-[#4a4c55]">{request.message}</p>
              </div>
            </div>
            {request.requireText && (
              <label className="flex flex-col gap-1.5 font-display text-[14px] font-medium text-[#101115]">
                <span>Type <span className="font-mono font-semibold">{request.requireText}</span> to confirm</span>
                <input ref={inputRef} value={typed} onChange={(event) => setTyped(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && ready) close(answer()); }} autoComplete="off" spellCheck={false} className="h-12 rounded-[10px] border border-[#bdbcb5] px-3.5 font-mono text-[16px] font-normal outline-none focus:border-2 focus:border-[#101115]" />
              </label>
            )}
            {request.askCode && (
              <label className="flex flex-col gap-1.5 font-display text-[14px] font-medium text-[#101115]">
                <span>Code from your authenticator app</span>
                <input ref={request.requireText ? undefined : inputRef} value={password} onChange={(event) => setPassword(event.target.value.slice(0, 24))} onKeyDown={(event) => { if (event.key === "Enter" && ready) close(answer()); }} autoComplete="one-time-code" inputMode="text" placeholder="000000" className="h-12 w-full rounded-[10px] border border-[#bdbcb5] px-3.5 text-center font-mono text-[20px] font-normal tracking-[0.25em] outline-none focus:border-2 focus:border-[#101115]" />
                <span className="text-[13px] font-normal text-[#6e7079]">This can’t be undone, so we check it’s really you. Open the app and type the 6-digit code (or a backup code).</span>
              </label>
            )}
            <div className="flex justify-end gap-3">
              <button ref={cancelRef} type="button" onClick={() => close(false)} className="h-11 rounded-[10px] border border-[#bdbcb5] bg-white px-5 font-display text-[15px] font-semibold text-[#101115] hover:border-[#101115] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#101115]/30">{request.cancelLabel || "Cancel"}</button>
              <button ref={confirmRef} type="button" disabled={!ready} onClick={() => close(answer())} className={`h-11 rounded-[10px] px-5 font-display text-[15px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:bg-[#e4e3de] disabled:text-[#9a9ba3] ${tone.button}`}>{request.confirmLabel || "Confirm"}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

// Falls back to the browser's own box if the provider isn't mounted, so nothing ever fails silently.
export function useConfirm() {
  const ask = useContext(ConfirmContext);
  return ask || (async (options) => (options.requireText ? window.prompt(`${options.message}\nType ${options.requireText} to confirm.`)?.trim() === options.requireText : window.confirm(`${options.title}\n${options.message}`)));
}
