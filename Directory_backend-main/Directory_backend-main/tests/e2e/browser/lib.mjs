// Browser-driving toolkit for the isolated test stack (see README.md). Headless Chrome over the DevTools protocol, no extra dependencies.
// Small browser-driving toolkit (headless Chrome over CDP) for the isolated e2e stack on :3000 / :5000.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const BASE = "http://localhost:3100";
export const API = "http://localhost:5100/api/v1";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SEED_FILE = process.env.E2E_SEED_FILE || path.join(HERE, ".seed.json");
export const seed = () => JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let usedBackup = 0;
export const nextBackupCode = () => seed().backupCodes[usedBackup++];

export async function api(method, p, { token, body, code } = {}) {
  const r = await fetch(API + p, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(code ? { "X-Confirm-Code": code } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, ...(await r.json().catch(() => ({}))) };
}
export async function loginApi(email, password = "Test@12345") {
  const r = await api("POST", "/auth/login", { body: { email, password } });
  if (r.data?.requires2fa) throw new Error("account needs 2FA: use browser login");
  return r.data?.accessToken;
}
export async function adminToken() {
  // Sign in with a fresh authenticator code through the API (used only for checking state, not for the clicks under test).
  const { currentTotp } = await import("../../../src/utils/totp.js");
  const r = await api("POST", "/auth/login", { body: { email: "admin@e2e.test", password: "Test@12345" } });
  const code = nextBackupCode();
  const s = await api("POST", "/auth/login/2fa", { body: { challenge: r.data.challenge, code } });
  void currentTotp; return s.data?.accessToken;
}

export async function launch({ width = 1440, height = 1000, port = 9377, mobile = false } = {}) {
  const dir = path.join(HERE, "out"); fs.mkdirSync(dir, { recursive: true });
  const chrome = spawn(process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, `--window-size=${width},${height}`, "--user-data-dir=" + path.join(dir, "p" + Date.now()), "about:blank"], { stdio: "ignore" });
  let targets; for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.length) break; } catch {} await sleep(300); }
  const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pending = new Map(); const errors = [];
  ws.onmessage = (e) => { const m = JSON.parse(e.data);
    if (m.method === "Runtime.exceptionThrown") errors.push("EXC " + (m.params.exceptionDetails.exception?.description || "").slice(0, 200));
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error" && !/status of (40[0-9]|429|503)/.test(m.params.entry.text)) errors.push("LOG " + m.params.entry.text.slice(0, 200));
    if (m.method === "Page.javascriptDialogOpening") { errors.push("NATIVE-DIALOG " + m.params.message); send("Page.handleJavaScriptDialog", { accept: true }); }
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Page.enable"); await send("Log.enable"); await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
  const ev = async (expression) => { const r = (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result; if (r?.exceptionDetails) throw new Error("page eval: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r?.result?.value; };
  const T = {
    ev, errors, send,
    goto: async (url, wait = 2500) => { await send("Page.navigate", { url: url.startsWith("http") ? url : BASE + url }); await sleep(wait); },
    text: async () => (await ev("document.body.innerText")).replace(/\s+/g, " "),
    has: async (re) => new RegExp(re, "i").test(await T.text()),
    waitText: async (re, ms = 9000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await T.has(re)) return true; await sleep(250); } return false; },
    waitGone: async (re, ms = 9000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (!(await T.has(re))) return true; await sleep(250); } return false; },
    // Click the first visible button/link/tab whose label matches; scope = CSS selector to search within (default: open dialog, else page)
    click: async (re, { scope, nth = 0, exact = false } = {}) => {
      const src = typeof re === "string" ? re : re.source;
      const r = await ev(`(() => { const root = ${scope ? `document.querySelector(${JSON.stringify(scope)})` : `([...document.querySelectorAll('[role=dialog],[role=alertdialog]')].pop() || document.querySelector('main') || document)`}; if (!root) return 'no-scope'; const rx = new RegExp(${JSON.stringify(exact ? "^" + src + "$" : src)}, 'i'); const els = [...root.querySelectorAll('button, a, [role=tab], [role=menuitem], summary, label')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && !e.disabled && rx.test((e.innerText || e.getAttribute('aria-label') || e.title || '').trim()); }); if (!els[${nth}]) return 'none:' + els.length; els[${nth}].scrollIntoView({ block: 'center' }); els[${nth}].click(); return 'ok'; })()`);
      if (r !== "ok") throw new Error(`click(${src}) -> ${r}`);
      await sleep(600);
    },
    fill: async (selOrPlaceholder, value, { scope } = {}) => {
      const r = await ev(`(() => { const root = ${scope ? `document.querySelector(${JSON.stringify(scope)})` : `([...document.querySelectorAll('[role=dialog],[role=alertdialog]')].pop() || document.querySelector('main') || document)`}; const s = ${JSON.stringify(selOrPlaceholder)}; const el = (() => { try { return root.querySelector(s); } catch { return null; } })() || [...root.querySelectorAll('input,textarea,select')].find((i) => i.placeholder === s || i.getAttribute('aria-label') === s); if (!el) return 'none'; const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : el.tagName === 'SELECT' ? HTMLSelectElement : HTMLInputElement; Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); return 'ok'; })()`);
      if (r !== "ok") throw new Error(`fill(${selOrPlaceholder}) -> ${r}`);
      await sleep(200);
    },
    buttons: async () => ev(`[...(([...document.querySelectorAll('[role=dialog],[role=alertdialog]')].pop() || document.querySelector('main') || document)).querySelectorAll('button, a[href]')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; }).map((e) => (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\\s+/g, ' ').slice(0, 40)).filter(Boolean)`),
    shot: async (name, full = false) => { let h = 0; if (full) { h = Math.min(await ev("document.documentElement.scrollHeight"), 4000); await send("Emulation.setDeviceMetricsOverride", { width, height: h, deviceScaleFactor: 1, mobile }); await sleep(250); } const r = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(`${dir}/${name}.png`, Buffer.from(r.result.data, "base64")); if (full) await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile }); return `${dir}/${name}.png`; },
    close: () => { try { ws.close(); } catch {} chrome.kill(); },
  };
  return T;
}

let pass = 0, fail = 0; const failures = [];
export async function check(name, fn) {
  try { const r = await fn(); if (r === false) throw new Error("returned false"); pass++; console.log(`  PASS  ${name}`); }
  catch (e) { fail++; failures.push(name); console.log(`  FAIL  ${name}  -> ${String(e.message).slice(0, 220)}`); }
}
export const summary = () => { console.log(`\n${pass} passed, ${fail} failed${fail ? "\nFailed: " + failures.join(" | ") : ""}`); return fail; };
