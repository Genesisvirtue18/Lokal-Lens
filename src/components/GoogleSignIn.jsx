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

/** Google's own "Continue with Google" button. Renders nothing until a client ID is configured. `onCredential(idToken)` gets the signed token. */
export default function GoogleSignIn({ onCredential, onError, text = "continue_with", disabled = false }) {
  const box = useRef(null);
  const callback = useRef(onCredential);
  const [failed, setFailed] = useState(false);
  useEffect(() => { callback.current = onCredential; }, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;
    let live = true;
    loadScript().then(() => {
      if (!live || !box.current) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (response) => { if (response?.credential) callback.current?.(response.credential); }, ux_mode: "popup", use_fedcm_for_prompt: true });
      box.current.innerHTML = "";
      window.google.accounts.id.renderButton(box.current, { type: "standard", theme: "outline", size: "large", text, shape: "rectangular", logo_alignment: "left", width: Math.min(400, box.current.clientWidth || 380) });
    }).catch((error) => { if (live) { setFailed(true); onError?.(error); } });
    return () => { live = false; };
  }, [text, onError]);

  if (!GOOGLE_CLIENT_ID) return null;
  if (failed) return <p className="text-center text-[13px] text-[#6e7079]">Google sign-in isn’t available right now. Use your email instead.</p>;
  return <div className={disabled ? "pointer-events-none opacity-60" : undefined} aria-busy={disabled}><div ref={box} className="flex min-h-[44px] justify-center" /></div>;
}
