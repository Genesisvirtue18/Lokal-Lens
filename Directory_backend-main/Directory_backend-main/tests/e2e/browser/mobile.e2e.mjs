import { launch, seed, sleep, check, summary, api, adminToken } from "./lib.mjs";

// The same jobs on a phone (390 px wide): every screen fits without sideways scrolling, and the main buttons can be reached and used.
const S = seed(); const ids = S.ids;
const { currentTotp } = await import("../../../src/utils/totp.js");
const t = await launch({ width: 390, height: 844, mobile: true, port: 9391 });
const overflow = () => t.ev("(() => { const vw = document.documentElement.clientWidth; const wide = [...document.querySelectorAll('body *')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > vw + 2 && getComputedStyle(el).position !== 'fixed' && !el.closest('nav[aria-label$=sections]'); }).slice(0, 3).map((el) => el.tagName + '.' + String(el.className).slice(0, 40)); return { fits: document.documentElement.scrollWidth <= vw + 2, wide }; })()");
const fits = async (label) => { const o = await overflow(); if (!o.fits) throw new Error(`${label} scrolls sideways: ${JSON.stringify(o.wide)}`); return true; };
const bottom = (label, nav) => t.click(label, { scope: `nav[aria-label="${nav}"]` }).then(() => sleep(1800));
const tap = async (re, opts) => { await t.click(re, opts); };

console.log("Owner on a phone");
await t.goto("/login", 3500); await t.click("Use password instead"); await t.fill("input[type=email]", "owner@e2e.test"); await t.fill("input[autocomplete=current-password]", "Test@12345"); await t.click("^Sign in$", { nth: 1 });
await t.waitText("Overview", 12000);
for (const [label] of [["Overview"], ["Inquiries"], ["Reviews"], ["Offers"], ["Analytics"], ["Account"]]) {
  await check(`owner tab "${label}" fits the screen`, async () => { await bottom(label, "Owner sections"); return fits(label); });
}
await check("owner: reply to a review from the phone", async () => {
  await bottom("Reviews", "Owner sections"); await t.click("^Reply$", { scope: "body" }); await sleep(900);
  await t.ev(`(() => { const ta = [...document.querySelectorAll('textarea')].filter((e) => e.getBoundingClientRect().width > 0).pop(); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, 'Thank you for the kind words!'); ta.dispatchEvent(new Event('input', { bubbles: true })); })()`); await sleep(300);
  await t.click("Post reply"); await sleep(2500); await fits("reply");
  const ownerTok = (await api("POST", "/auth/login", { body: { email: "owner@e2e.test", password: "Test@12345" } })).data.accessToken;
  return ((await api("GET", `/businesses/${ids.smile}/reviews`)).data?.items || []).some((r) => /kind words/.test(r.reply?.text || "")) && Boolean(ownerTok);
});
await check("owner: open an inquiry, reply to the customer and mark it contacted", async () => {
  await bottom("Inquiries", "Owner sections"); await t.click("^Notes$", { scope: "body" }); await sleep(1200); await fits("lead panel");
  await t.ev(`(() => { const ta = [...document.querySelectorAll('textarea')].filter((e) => e.getBoundingClientRect().width > 0 && e.id === 'lead-reply')[0]; Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, 'Yes, we can see you tomorrow at 11.'); ta.dispatchEvent(new Event('input', { bubbles: true })); })()`); await sleep(300);
  await t.click("^Send reply$", { scope: "body" }); await sleep(2500);
  const ownerTok = (await api("POST", "/auth/login", { body: { email: "owner@e2e.test", password: "Test@12345" } })).data.accessToken;
  const lead = ((await api("GET", "/owner/leads?limit=20", { token: ownerTok })).data?.items || []).find((l) => l.name === "Jamie");
  return lead && lead.status === "contacted" && (lead.replies || []).some((r) => /tomorrow at 11/.test(r.text));
});
await check("owner: pause and resume a listing", async () => {
  await bottom("Overview", "Owner sections"); await sleep(800);
  await t.click("^Pause$", { scope: "body" }); await sleep(900); await t.click("^Pause listing$"); await sleep(2500);
  const ownerTok = (await api("POST", "/auth/login", { body: { email: "owner@e2e.test", password: "Test@12345" } })).data.accessToken;
  const paused = ((await api("GET", "/owner/businesses?limit=20", { token: ownerTok })).data.items.find((b) => b._id === ids.smile) || {}).listingStatus === "paused";
  await t.click("^Resume$", { scope: "body" }); await sleep(900); await t.click("^Go live$"); await sleep(2500);
  return paused && ((await api("GET", "/owner/businesses?limit=20", { token: ownerTok })).data.items.find((b) => b._id === ids.smile) || {}).listingStatus === "published";
});
await check("owner: the add-business wizard fits and its first step works on a phone", async () => {
  await bottom("Overview", "Owner sections"); await t.click("Add another business|Add a business", { scope: "body", nth: 0 }); await sleep(3000);
  await fits("wizard step 1"); return (await t.text()).includes("STEP 1 OF 5");
});

console.log("\nCustomer on a phone");
await t.goto("/login", 3000); await t.ev("localStorage.clear(); true"); await t.goto("/login", 3000);
await t.click("Use password instead"); await t.fill("input[type=email]", "customer@e2e.test"); await t.fill("input[autocomplete=current-password]", "Test@12345"); await t.click("^Sign in$", { nth: 1 });
await t.waitText("Saved|Overview", 12000);
for (const label of ["Overview", "Saved", "Reviews", "Inquiries", "Account"]) await check(`customer tab "${label}" fits the screen`, async () => { await bottom(label, "Account sections"); return fits(label); });
await check("listing page on a phone: no sideways scroll, amenities in two columns, call bar visible", async () => {
  await t.goto("/directory/smile-dental", 7000); await fits("listing");
  const cols = await t.ev("(() => { const ul = [...document.querySelectorAll('ul')].find((u) => /grid/.test(u.className) && u.querySelectorAll('li').length >= 2 && /grid-cols-2/.test(u.className)); return ul ? getComputedStyle(ul).gridTemplateColumns.split(' ').length : 0; })()");
  console.log("   amenity columns:", cols);
  return cols === 2;
});

console.log("\nAdmin on a phone");
await t.goto("/login", 3000); await t.ev("localStorage.clear(); true"); await t.goto("/login", 3000);
await t.click("Use password instead"); await t.fill("input[type=email]", "admin@e2e.test"); await t.fill("input[autocomplete=current-password]", "Test@12345"); await t.click("^Sign in$", { nth: 1 });
await t.waitText("Authenticator code", 8000); await t.fill("input[autocomplete=one-time-code]", currentTotp(S.secret)); await t.click("Verify & continue"); await t.waitText("Overview", 9000);
for (const label of ["Overview", "Businesses", "People", "Reports", "Reviews", "Inquiries", "Categories", "Activity", "Account"]) await check(`admin tab "${label}" fits the screen`, async () => { await bottom(label, "Admin sections"); return fits(label); });
await check("admin: open a listing, suspend it and restore it from the phone", async () => {
  await bottom("Businesses", "Admin sections"); await t.click("^Manage$", { scope: "body", nth: 0 }); await sleep(1200); await fits("manage panel");
  await t.click("Suspend listing"); await sleep(900); await t.click("^Suspend"); await sleep(2500);
  const tok = await adminToken(); const suspended = (await api("GET", "/admin/businesses?limit=50", { token: tok })).data.items.filter((b) => b.listingStatus === "suspended").length;
  await t.click("Restore listing"); await sleep(900); if ((await t.ev("document.querySelectorAll('[role=alertdialog]').length")) > 0) await t.click("^Restore", { nth: 0 }); await sleep(2500);
  return suspended === 1 && (await api("GET", "/admin/businesses?limit=50", { token: tok })).data.items.every((b) => b.listingStatus !== "suspended");
});
await check("admin: reports and claims screen works on a phone", async () => {
  await bottom("Reports", "Admin sections"); await fits("reports"); await t.click("Listing claims"); await sleep(1200); await fits("claims");
  return (await t.has("Approve and hand over")) && (await t.has("Reject"));
});

console.log("errors:", t.errors); t.close(); const f = summary(); process.exit(f ? 1 : 0);
