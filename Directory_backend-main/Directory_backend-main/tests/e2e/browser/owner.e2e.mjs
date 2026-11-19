import fs from "node:fs";
import { launch, seed, sleep, check, summary, api } from "./lib.mjs";
const dir = new URL("./", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const fillJs = fs.readFileSync(dir + "wizfill.js", "utf8"), stateJs = fs.readFileSync(dir + "wizstate.js", "utf8");
const S = seed(); const ids = S.ids;
const login = async (email, pw = "Test@12345") => (await api("POST", "/auth/login", { body: { email, password: pw } })).data?.accessToken;
const t = await launch({ width: 1440, height: 1000 });
const dump = async (l) => console.log(`   [${l}]`, (await t.buttons()).join(" | ").slice(0, 420));
const uiLogin = async (email, pw = "Test@12345") => { await t.goto("/login", 3000); await t.click("Use password instead"); await t.fill("input[type=email]", email); await t.fill("input[autocomplete=current-password]", pw); await t.click("^Sign in$", { nth: 1 }); return t.waitText("Overview|Inquiries", 12000); };
const tab = (n) => t.click(n, { scope: "aside" }).then(() => sleep(1800));
const ownerBiz = async (tok) => (await api("GET", "/owner/businesses?limit=50", { token: tok })).data?.items || [];
let tok;

console.log("Owner sign-in and overview");
await check("owner signs in with email and password and lands on the dashboard", async () => { const ok = await uiLogin("owner@e2e.test"); tok = await login("owner@e2e.test"); return ok && (await t.ev("location.pathname")) === "/business-owner"; });
await check("overview shows their listing, inquiry and review counts", async () => { const loaded = await t.waitText("Smile Dental", 10000); const x = await t.text(); return loaded && /Inquiries/.test(x); });

console.log("\nAdd a business (5-step wizard)");
await check("create a business through every wizard step and submit for review", async () => {
  await t.click("Add a business", { scope: "aside" }); await sleep(3000);
  for (let i = 0; i < 9; i++) {
    if (/Add at least one service/.test(await t.text()) || (/Services or products/.test(await t.text()) && !(await t.has("Cold coffee|Browser Test Cafe .*₹")))) await t.click("^Add a service$", { scope: "body" }).catch(() => {});
    await sleep(500); await t.ev(fillJs); await sleep(800); await t.ev(fillJs); await sleep(500);
    await t.click("^Add service$", { scope: "body" }).catch(() => {}); await sleep(400);
    if (/Submit for review/.test(await t.text())) { await t.click("Submit for review", { scope: "body" }); await sleep(3000); break; }
    await t.click("^Continue$", { scope: "body" }); await sleep(1600);
  }
  const mine = await ownerBiz(tok); const created = mine.find((b) => b.name === "Browser Test Cafe");
  if (!created) throw new Error("listing was not created; page: " + (await t.text()).slice(0, 200));
  const pub = await api("GET", `/businesses/${created.slug}`);
  return created.listingStatus === "pending_review" && pub.status === 404;
});
await check("a new listing is not public until our team approves it, and shows 'in review' to the owner", async () => { await t.goto("/business-owner", 4000); return /In review/i.test(await t.text()); });

console.log("\nEdit a listing");
await check("edit the description of a live listing and save it", async () => {
  await t.goto("/business-owner", 4000);
  const idx = await t.ev("[...document.querySelectorAll('li')].findIndex((l) => /Smile Dental/.test(l.innerText) && [...l.querySelectorAll('button,a')].some((b) => /^Edit$/.test(b.innerText.trim())))");
  await t.ev(`(() => { const li = [...document.querySelectorAll('li')][${idx}]; [...li.querySelectorAll('button,a')].find((b) => /^Edit$/.test(b.innerText.trim())).click(); })()`); await sleep(3000);
  const NEW = "Smile Dental offers gentle family dentistry with modern equipment, clear pricing and friendly, experienced staff.";
  await t.ev(`(() => { const ta = [...document.querySelectorAll('textarea')][0]; Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, ${JSON.stringify(NEW)}); ta.dispatchEvent(new Event('input', { bubbles: true })); })()`); await sleep(400);
  for (let i = 0; i < 8; i++) {
    await t.ev(fillJs); await sleep(600);
    const txt = await t.text();
    if (/Save changes|Update listing|Submit for review|Save and exit/.test(txt) && /STEP 5 OF 5/.test(txt)) { await t.click("Save changes|Update listing|Submit for review|Save and exit", { scope: "body" }); await sleep(3000); break; }
    await t.click("^Continue$", { scope: "body" }); await sleep(1500);
  }
  const b = (await ownerBiz(tok)).find((x) => x._id === ids.smile);
  return (b?.description || "").startsWith("Smile Dental offers gentle");
});

console.log("\nPause / resume");
await check("pause a live listing (hidden from the public) and make it live again", async () => {
  await t.goto("/business-owner", 4000); await dump("overview buttons");
  await t.click("^Pause$", { scope: "body" }); await sleep(900);
  await t.click("^Pause listing$"); await sleep(2500);   // the confirm dialog (topmost dialog is the default scope)
  const paused = (await ownerBiz(tok)).find((x) => x._id === ids.smile)?.listingStatus === "paused" && (await api("GET", "/businesses/smile-dental")).status === 404;
  await dump("after pause"); await t.click("^Resume$|^Go live$|^Make live$", { scope: "body" }); await sleep(900);
  await t.click("^Go live$"); await sleep(2500);
  return paused && (await ownerBiz(tok)).find((x) => x._id === ids.smile)?.listingStatus === "published";
});

console.log("\nReviews");
await tab("Reviews");
await check("reply to a customer review; the reply is saved and shown publicly", async () => {
  await dump("reviews"); await t.click("^Reply$", { scope: "body" }); await sleep(900);
  await t.ev(`(() => { const ta = [...document.querySelectorAll('textarea')].filter((e) => e.getBoundingClientRect().width > 0).pop(); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, 'Thank you for visiting, we are glad you liked it!'); ta.dispatchEvent(new Event('input', { bubbles: true })); })()`); await sleep(400); await dump("reply dialog");
  await t.click("Post reply|Send reply|Publish reply|^Publish|Save reply"); await sleep(2500);
  const rv = (await api("GET", `/businesses/${ids.smile}/reviews`)).data?.items || [];
  return rv.some((r) => r.reply?.text?.includes("glad you liked"));
});

console.log("\nInquiries");
await tab("Inquiries");
await check("open an inquiry, mark it contacted and add a follow-up note", async () => {
  await t.click("^Notes$", { scope: "body" }); await sleep(1200);
  await t.click("^Contacted$", { scope: "body", nth: 0 }); await sleep(1500);   // the status button inside the detail panel
  await t.ev(`(() => { const ta = [...document.querySelectorAll('textarea,input[type=text]')].filter((e) => e.getBoundingClientRect().width > 0 && !e.closest('aside')).pop(); const P = ta.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement; Object.getOwnPropertyDescriptor(P.prototype, 'value').set.call(ta, 'Called back, booked for Monday'); ta.dispatchEvent(new Event('input', { bubbles: true })); })()`); await sleep(400);
  await t.click("^Add$", { scope: "body" }); await sleep(1800);
  const leads = (await api("GET", "/owner/leads?limit=50", { token: tok })).data?.items || [];
  const l = leads.find((x) => x.name === "Jamie"); console.log("   lead:", l && { status: l.status, notes: l.notes });
  return l && l.status === "contacted" && (l.notes || []).some((n) => /booked for Monday/.test(n));
});

console.log("\nOffers and analytics");
await tab("Offers");
await check("create an offer", async () => {
  await dump("offers"); await t.click("New offer|Add offer|Create offer|Add an offer", { scope: "body" }); await sleep(900);
  const info = await t.ev(stateJs); console.log("   offer form:", info.slice(0, 300));
  await t.ev(`(() => { const set = (el, v) => { const P = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : el.tagName === 'SELECT' ? HTMLSelectElement : HTMLInputElement; Object.getOwnPropertyDescriptor(P.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); }; const els = [...document.querySelectorAll('input,textarea,select')].filter((e) => e.getBoundingClientRect().width > 0 && !e.closest('aside,nav') && !['hidden','checkbox','radio','file'].includes(e.type)); for (const e of els) { const l = ((e.closest('label')?.innerText || '') + (e.placeholder || '')).toLowerCase(); if (e.tagName === 'SELECT') { const o = [...e.options].find((x) => x.value && !/^(choose|select)/i.test(x.text)); if (o && !e.value) set(e, o.value); } else if (e.type === 'date') { set(e, '2030-01-31'); } else if (/title|name/.test(l)) set(e, '20% off first visit'); else if (/desc|detail/.test(l)) set(e, 'Show this offer to get 20% off your first visit.'); else if (/code/.test(l)) set(e, 'FIRST20'); } })()`); await sleep(500);
  await t.click("Publish offer|Create offer|Save offer|^Save$|^Publish$|^Add offer$", { scope: "body", nth: 0 }); await sleep(2500);
  const b = (await api("GET", `/owner/businesses/${ids.smile}`, { token: tok })).data?.item; return (b?.offers || []).some((o) => /20% off/.test(o.title));
});
await tab("Analytics");
await check("analytics page loads real numbers without errors", async () => { const x = await t.text(); await t.shot("owner_analytics"); return /views|profile views|How customers find you/i.test(x) && t.errors.length === 0; });

console.log("\nAccount");
await tab("Account settings");
await check("change the display name", async () => {
  await t.ev(`(() => { const lab = [...document.querySelectorAll('label')].find((l) => /^Full name/.test(l.innerText.trim())); const i = lab.querySelector('input') || document.getElementById(lab.htmlFor); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, 'Renamed Owner'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`); await sleep(300);
  await t.click("Save profile", { scope: "body" }); await sleep(2000);
  return (await api("GET", "/auth/me", { token: tok })).data?.user?.name === "Renamed Owner";
});
await check("wrong current password is refused; correct one changes it and old password stops working", async () => {
  const pw = await t.ev("[...document.querySelectorAll('input[type=password]')].length"); console.log("   password inputs:", pw);
  const setPw = (i, v) => t.ev(`(() => { const el = [...document.querySelectorAll('input[type=password]')][${i}]; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await setPw(0, "WrongPassword1"); await setPw(1, "NewPassw0rd!x"); await setPw(2, "NewPassw0rd!x"); await t.click("Update password", { scope: "body" }); await sleep(2000);
  const refused = /not right|incorrect|wrong/i.test(await t.text());
  await setPw(0, "Test@12345"); await t.click("Update password", { scope: "body" }); await sleep(2500);
  const oldBlocked = (await api("POST", "/auth/login", { body: { email: "owner@e2e.test", password: "Test@12345" } })).status === 401;
  const newWorks = (await api("POST", "/auth/login", { body: { email: "owner@e2e.test", password: "NewPassw0rd!x" } })).status === 200;
  return refused && oldBlocked && newWorks;
});

console.log("\nDelete a listing");
await check("delete the new listing by typing its name", async () => {
  await t.goto("/business-owner", 4000);
  const idx = await t.ev("[...document.querySelectorAll('li')].findIndex((l) => /Browser Test Cafe/.test(l.innerText))");
  await t.ev(`(() => { const li = [...document.querySelectorAll('li')][${idx}]; const b = li.querySelector('button[aria-label*=elete], button[title*=elete]') || [...li.querySelectorAll('button')].pop(); b.click(); })()`); await sleep(1000); await dump("delete dialog");
  await t.ev(`(() => { const i = [...document.querySelectorAll('[role=dialog] input, [role=alertdialog] input')].pop(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, 'Browser Test Cafe'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`); await sleep(400);
  await t.click("^Delete listing$"); await sleep(2500);
  tok = await login("owner@e2e.test", "NewPassw0rd!x");
  return !(await ownerBiz(tok)).some((b) => b.name === "Browser Test Cafe");
});

console.log("\nRe-review after a sensitive edit");
await check("changing the name of a live listing sends it back for review and tells the owner", async () => {
  await t.goto("/business-owner", 4000);
  const idx = await t.ev("[...document.querySelectorAll('li')].findIndex((l) => /Smile Dental/.test(l.innerText) && [...l.querySelectorAll('button,a')].some((b) => /^Edit$/.test(b.innerText.trim())))");
  await t.ev(`(() => { const li = [...document.querySelectorAll('li')][${idx}]; [...li.querySelectorAll('button,a')].find((b) => /^Edit$/.test(b.innerText.trim())).click(); })()`); await sleep(3000);
  await t.ev(`(() => { const el = [...document.querySelectorAll('input')].find((e) => /^Business name/.test(e.closest('label')?.innerText || '')); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'Smile Dental Studio'); el.dispatchEvent(new Event('input', { bubbles: true })); })()`); await sleep(400);
  for (let i = 0; i < 8; i++) {
    await t.ev(fillJs); await sleep(600);
    const txt = await t.text();
    if (/Save changes|Update listing|Submit for review|Save and exit/.test(txt) && /STEP 5 OF 5/.test(txt)) { await t.click("Save changes|Update listing|Submit for review|Save and exit", { scope: "body" }); await sleep(3000); break; }
    await t.click("^Continue$", { scope: "body" }); await sleep(1500);
  }
  const notice = await t.has("our team will check the listing again");
  const b = (await ownerBiz(tok)).find((x) => x._id === ids.smile);
  const hidden = (await api("GET", "/businesses/smile-dental")).status === 404;
  console.log("   status:", b?.listingStatus, "| note:", b?.reviewNote);
  return notice && b?.listingStatus === "pending_review" && /Changed: name/.test(b?.reviewNote || "") && hidden;
});

console.log("\nconsole/native-dialog errors:", t.errors);
t.close(); const f = summary(); process.exit(f ? 1 : 0);
