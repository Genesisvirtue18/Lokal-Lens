"use client";

import { useEffect, useRef, useState } from "react";

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const SCRIPT = "https://accounts.google.com/gsi/client";

let loading;
function loadScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.accounts?.id) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = SCRIPT; tag.async = true; tag.defer = true;
    tag.onload = () => resolve();
    tag.onerror = () => { loading = undefined; reject(new Error("Google sign-in could not load")); };
    document.head.appendChild(tag);
  });
  return loading;
}

const LABEL = { signin_with: "Sign in with Google", signup_with: "Sign up with Google", continue_with: "Continue with Google" };
const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.3.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
);

/** Google's own "Continue with Google" button. Renders nothing until a client ID is configured. `onCredential(idToken)` gets the signed token. */
export default function GoogleSignIn({ onCredential, onError, text = "continue_with", disabled = false }) {
  const box = useRef(null);
  const callback = useRef(onCredential);
  const [failed, setFailed] = useState(false);
  const wrap = useRef(null);
  const [scale, setScale] = useState({ x: 1, y: 1 });
  // Google draws its own button in an iframe that cannot be restyled. It is stretched invisibly over our own button, so the click
  // is Google's (same secure popup) while what people see matches the rest of the page.
  useEffect(() => {
    const element = wrap.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;
    const apply = () => setScale({ x: (element.clientWidth || 400) / 400, y: (element.clientHeight || 40) / 40 });
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(element);
    return () => observer.disconnect();
  }, [failed]);
  useEffect(() => { callback.current = onCredential; }, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;
    let live = true;
    loadScript().then(() => {
      if (!live || !box.current) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (response) => { if (response?.credential) callback.current?.(response.credential); }, ux_mode: "popup", use_fedcm_for_prompt: true });
      box.current.innerHTML = "";
      window.google.accounts.id.renderButton(box.current, { type: "standard", theme: "outline", size: "large", text, shape: "rectangular", logo_alignment: "left", width: 400 });
    }).catch((error) => { if (live) { setFailed(true); onError?.(error); } });
    return () => { live = false; };
  }, [text, onError]);

  if (!GOOGLE_CLIENT_ID) return null;
  if (failed) return <p className="text-center text-[13px] text-[#6e7079]">Google sign-in isn’t available right now. Use your email instead.</p>;
  return (
    <div className={disabled ? "pointer-events-none opacity-60" : undefined} aria-busy={disabled}>
      <div ref={wrap} className="group relative h-14 w-full">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center gap-3 rounded-[12px] border border-[#bdbcb5] bg-white font-display text-[15px] font-medium text-[#101115] shadow-[0_1px_2px_rgba(16,17,21,0.06)] transition group-hover:border-[#101115] group-hover:bg-[#f7f7f4] group-focus-within:border-2 group-focus-within:border-[#002fa7]">
          <GoogleLogo />{LABEL[text] || LABEL.continue_with}
        </div>
        <div ref={box} className="absolute left-0 top-0 origin-top-left" style={{ width: 400, height: 40, opacity: 0.003, transform: `scale(${scale.x}, ${scale.y})` }} />
      </div>
    </div>
  );
}
