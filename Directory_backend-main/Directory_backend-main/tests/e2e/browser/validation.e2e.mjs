import fs from "node:fs";
import { launch, sleep, check, summary } from "./lib.mjs";
const dir = new URL("./", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const fillJs = fs.readFileSync(dir + "wizfill.js", "utf8"), stateJs = fs.readFileSync(dir + "wizstate.js", "utf8");
const t = await launch({ width: 1440, height: 1000 });
const setAria = (label, value) => t.ev(`(() => { const el = [...document.querySelectorAll('select,input')].find((e) => e.getAttribute('aria-label') === ${JSON.stringify(label)}); if (!el) return 'none'; const P = el.tagName === 'SELECT' ? HTMLSelectElement : HTMLInputElement; Object.getOwnPropertyDescriptor(P.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); return el.value; })()`);
const step = async () => (await t.ev(stateJs)).match(/STEP \d OF \d/)?.[0];
await t.goto("/login", 3000); await t.click("Use password instead"); await t.fill("input[type=email]", "owner@e2e.test"); await t.fill("input[autocomplete=current-password]", "Test@12345"); await t.click("^Sign in$", { nth: 1 });
await t.waitText("Overview", 12000);
await t.click("Add a business", { scope: "aside" }); await sleep(3000);
await t.ev(fillJs); await sleep(900); await t.ev(fillJs); await sleep(500); await t.click("^Continue$", { scope: "body" }); await sleep(1500);   // step 1 -> 2
await t.ev(fillJs); await sleep(900); await t.ev(fillJs); await sleep(500);

console.log("Form validation (user can't enter invalid data)");
await check("PIN code and phone fields accept digits only", async () => {
  const typed = await t.ev(`(() => { const el = [...document.querySelectorAll('input')].find((e) => /pin code/i.test(e.closest('label')?.innerText || '')); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'ab12-34xy5'); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
  console.log("   PIN after typing 'ab12-34xy5':", JSON.stringify(typed));
  return /^\d*$/.test(typed) && typed.length <= 6;
});
await check("a 5-digit PIN is refused; the right one lets the owner continue", async () => {
  await t.click("^Continue$", { scope: "body" }); await sleep(1500);
  const refused = (await step()) === "STEP 2 OF 5";
  await t.ev(`(() => { const el = [...document.querySelectorAll('input')].find((e) => /pin code/i.test(e.closest('label')?.innerText || '')); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '201001'); el.dispatchEvent(new Event('input', { bubbles: true })); })()`); await sleep(400);
  await t.click("^Continue$", { scope: "body" }); await sleep(1500);
  return refused && (await step()) === "STEP 3 OF 5";
});
await check("step 3: closing time earlier than opening time is refused", async () => {
  if ((await step()) !== "STEP 3 OF 5") throw new Error("not on step 3: " + (await step()));
  await t.click("^Add a service$", { scope: "body" }).catch(() => {}); await sleep(500); await t.ev(fillJs); await sleep(600); await t.click("^Add service$", { scope: "body" }).catch(() => {}); await sleep(500);
  console.log("   open/close set:", await setAria("monday opens: hour", "9"), await setAria("monday opens: AM or PM", "AM"), await setAria("monday closes: hour", "8"), await setAria("monday closes: AM or PM", "AM"));
  await sleep(500); await t.click("^Continue$", { scope: "body" }); await sleep(1500);
  const still = (await step()) === "STEP 3 OF 5"; const msg = (await t.text()).match(/[^.]*(closing|close|after opening|later than)[^.]*\./i)?.[0];
  console.log("   still on step 3:", still, "| message:", msg && msg.trim().slice(0, 120));
  await t.shot("validation_hours"); return still;
});
await check("fixing the hours lets the owner continue", async () => {
  await setAria("monday closes: hour", "6"); await setAria("monday closes: AM or PM", "PM"); await sleep(500);
  await t.click("^Continue$", { scope: "body" }); await sleep(1500); return (await step()) === "STEP 4 OF 5";
});
await check("step 4: phone number rejects letters; a wrong-format email and a bad website are refused", async () => {
  const phone = await t.ev(`(() => { const el = [...document.querySelectorAll('input')].find((e) => /^phone/i.test(e.closest('label')?.innerText || '')); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'call me 98x'); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
  console.log("   phone after 'call me 98x':", JSON.stringify(phone));
  const setByLabel = (re, v) => t.ev(`(() => { const el = [...document.querySelectorAll('input')].find((e) => ${re}.test(e.closest('label')?.innerText || '')); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
  await setByLabel("/^phone/i", "9876543210"); await setByLabel("/^email/i", "not-an-email"); await setByLabel("/^website/i", "javascript:alert(1)");
  await t.click("^Continue$", { scope: "body" }); await sleep(1500);
  const refused = (await step()) === "STEP 4 OF 5"; console.log("   still on step 4:", refused, "| errors:", (await t.ev(stateJs)).match(/"red":\[[^\]]*\]/)?.[0]);
  return /^\d*$/.test(phone) && refused;
});
console.log("errors:", t.errors); t.close(); const f = summary(); process.exit(f ? 1 : 0);
