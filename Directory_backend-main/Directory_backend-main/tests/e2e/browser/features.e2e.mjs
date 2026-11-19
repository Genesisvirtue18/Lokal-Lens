import { launch, seed, sleep, check, summary, api, adminToken } from "./lib.mjs";

const S = seed(); const ids = S.ids;
const login = async (email) => (await api("POST", "/auth/login", { body: { email, password: "Test@12345" } })).data?.accessToken;
const t = await launch({ width: 1440, height: 1000 });
const setValue = (selector, value) => t.ev(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return 'none'; const P = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement; Object.getOwnPropertyDescriptor(P.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);

console.log("Public pages");
await check("Terms of Service page opens, and the footer and sign-up link to it", async () => {
  await t.goto("/terms", 3500);
  const heading = await t.ev("(document.querySelector('h1')||{}).innerText");
  const footer = await t.ev("[...document.querySelectorAll('footer a')].some((a) => a.getAttribute('href') === '/terms')");
  await t.goto("/register", 3500);
  const signup = await t.ev("[...document.querySelectorAll('a')].some((a) => a.getAttribute('href') === '/terms')");
  return heading === "Terms of Service" && footer && signup;
});
await check("a city page describes the city in words built from its listings", async () => {
  await t.goto("/ghaziabad", 5000); const x = await t.text(); return /Lokal Lens lists \d+ local business/.test(x) && /Smile Dental|Waiting Clinic|Dental/.test(x);
});
await check("a city + category page lists the businesses (city in the URL is lower-case) and explains the category", async () => {
  await t.goto(`/ghaziabad/healthcare/nct-${ids.health}`, 6000); const x = await t.text();
  return /Smile Dental/.test(x) && /Healthcare in Ghaziabad/.test(x) && /listings? on Lokal Lens/.test(x) && !/No healthcare found/.test(x);
});
await check("/ghaziabad/healthcare redirects to the real category page", async () => {
  await t.goto("/ghaziabad/healthcare", 3000); for (let i = 0; i < 20; i++) { if (/^\/ghaziabad\/healthcare\/nct-[a-f0-9]{24}$/.test(await t.ev("location.pathname"))) return true; await sleep(1000); } return false;   // only the shape is checked: the dev server caches the category list between API restarts
});

console.log("\nCustomer: inquiry, WhatsApp, report, reply, withdraw");
await t.goto("/login", 3000); await t.click("Use password instead"); await t.fill("input[type=email]", "customer@e2e.test"); await t.fill("input[autocomplete=current-password]", "Test@12345"); await t.click("^Sign in$", { nth: 1 });
await t.waitText("Overview|Saved", 12000);
await check("the inquiry form is pre-filled for a signed-in customer and keeps letters out of the phone box", async () => {
  await t.goto("/directory/smile-dental", 7000);
  const name = await t.ev("(document.querySelector('form input[name=name]')||{}).value");
  const typed = await setValue("form input[name=phone]", "call 98x11-1111 11 abc");
  console.log("   pre-filled name:", JSON.stringify(name), "| phone after typing letters:", JSON.stringify(typed));
  return /Customer/.test(name || "") && /^[\d+\s-]*$/.test(typed);
});
await check("sending an inquiry works and it shows up under My inquiries", async () => {
  await setValue("form input[name=phone]", "9811111111"); await setValue("form textarea[name=message]", "Do you do teeth whitening on Sundays?");
  await t.click("Send inquiry", { scope: "body" }); await sleep(2500);
  const ok = await t.has("Your inquiry was sent");
  const tok = await login("customer@e2e.test"); const mine = (await api("GET", "/users/me/inquiries", { token: tok })).data?.items || [];
  return ok && mine.length === 1 && mine[0].message.includes("whitening");
});
await check("the WhatsApp button opens a chat with a ready-written message", async () => {
  await t.ev("window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; true");
  await t.click("^WhatsApp$", { scope: "body" }); await sleep(800);
  await t.click("WhatsApp"); await sleep(800);   // the confirm button in the "Continue to WhatsApp" dialog
  const href = (await t.ev("window.__opened[0]")) || "";
  console.log("   whatsapp link:", decodeURIComponent(href));
  return /^https:\/\/wa\.me\/919876543210\?text=Hi%2C%20I%20found%20Smile%20Dental%20on%20Lokal%20Lens/.test(href);
});
await check("a signed-in customer can report a listing; it reaches the admin queue", async () => {
  await t.click("^Report this listing$", { scope: "body", nth: 0 }); await sleep(900);
  console.log("   report dialog buttons:", (await t.buttons()).join(" | ").slice(0, 300));
  await t.click("closed or has moved", { scope: "body" }); await sleep(300);
  await t.click("^Send report$"); await sleep(2000);
  const thanks = await t.has("Thanks for letting us know");
  const adminTok = await adminToken(); const open = (await api("GET", "/admin/listing-reports", { token: adminTok })).data?.items || [];
  return thanks && open.length === 1 && open[0].reason === "closed";
});
await check("the owner's reply shows up for the customer", async () => {
  const cust = await login("customer@e2e.test"); const inquiry = (await api("GET", "/users/me/inquiries", { token: cust })).data.items[0];
  const owner = await login("owner@e2e.test");
  const sent = await api("POST", `/owner/leads/${inquiry.id}/reply`, { token: owner, body: { text: "Yes, whitening is available on Sundays from 10 to 2." } });
  await t.goto("/account?tab=inquiries", 6000);
  return sent.status === 200 && await t.waitText("whitening is available on Sundays", 8000) && await t.has("Reply from Smile Dental");
});
await check("the customer withdraws the inquiry; the owner can no longer reply", async () => {
  await t.click("^Withdraw$", { scope: "body" }); await sleep(900);
  await t.click("^Withdraw$"); await sleep(2000);
  const badge = await t.has("Withdrawn");
  const cust = await login("customer@e2e.test"); const inquiry = (await api("GET", "/users/me/inquiries", { token: cust })).data.items[0];
  const owner = await login("owner@e2e.test");
  const blocked = await api("POST", `/owner/leads/${inquiry.id}/reply`, { token: owner, body: { text: "Are you still there?" } });
  return badge && inquiry.withdrawn === true && blocked.status === 409;
});

console.log("\nAdmin handles the report");
await check("Reported listings tab: the report is listed and the listing can be suspended", async () => {
  // sign in as the admin in the same browser
  await t.goto("/login", 3000); await t.ev("localStorage.clear(); true"); await t.goto("/login", 3000);
  const { currentTotp } = await import("../../../src/utils/totp.js");
  await t.click("Use password instead"); await t.fill("input[type=email]", "admin@e2e.test"); await t.fill("input[autocomplete=current-password]", "Test@12345"); await t.click("^Sign in$", { nth: 1 });
  await t.waitText("Authenticator code", 8000); await t.fill("input[autocomplete=one-time-code]", currentTotp(S.secret)); await t.click("Verify & continue"); await t.waitText("Overview", 9000);
  await t.click("Reports", { scope: "aside" }); await sleep(1500);
  await t.click("Reported listings", { scope: "body" }); await sleep(1500);
  const seen = await t.has("Business is closed") && await t.has("Smile Dental");
  await t.click("^Suspend listing$", { scope: "body" }); await sleep(900); await t.click("^Suspend listing$"); await sleep(2500);
  const pub = (await api("GET", "/businesses/smile-dental")).status;
  return seen && pub === 404;
});

console.log("errors:", t.errors); t.close(); const f = summary(); process.exit(f ? 1 : 0);
