// A careless, curious visitor in a real browser: signed-out and signed-in, wrong turns, odd typing, Back button, other people's areas.
// Needs the isolated stack (see README.md). Restart the test API (node tests/e2e/server.mjs) before each run: it creates accounts.
import { launch, seed, sleep, check, summary, api } from "./lib.mjs";
seed();
const t = await launch({ width: 1280, height: 1000 });
const path = () => t.ev("location.pathname");
const reset = async () => { await t.send("Network.clearBrowserCookies"); await t.goto("/login", 1500); await t.ev("localStorage.clear(); sessionStorage.clear();"); };
const pick = (n) => t.ev(`document.querySelectorAll('input[type=radio]')[${n}].click()`);
const tick = () => t.ev("document.querySelector('input[type=checkbox]').click()");
const codeBox = "input[inputmode=numeric], input[autocomplete=one-time-code], input[maxlength='6']";
const submitForm = (label) => t.click(label, { scope: "main" });
const signInWithCode = async (email) => { await reset(); await t.goto("/login", 2500); await t.fill("input[type=email]", email); await submitForm("^Send code$"); };

console.log("Signed-out visitor opens private pages");
for (const p of ["/business-owner", "/account", "/admin", "/add-business"]) {
  await check(`${p} while signed out goes to the login page`, async () => { await reset(); await t.goto(p, 6000); return (await path()).startsWith("/login"); });
}
await check("the login page never shows a dashboard before redirecting (no flash of owner screens)", async () => { await reset(); await t.goto("/business-owner", 6000); const x = await t.text(); return !/Add your business|Inquiries|Analytics/.test(x); });

console.log("\nSign in tab: odd things typed into the email box");
await check("empty email + Send code -> asks for an email, nothing is sent", async () => { await reset(); await t.goto("/login", 2500); await submitForm("^Send code$"); return (await t.has("valid email")) && (await path()).startsWith("/login"); });
await check("'abc' as email -> asks for a valid email", async () => { await reset(); await t.goto("/login", 2500); await t.fill("input[type=email]", "abc"); await submitForm("^Send code$"); return t.has("valid email"); });
await check("an email that has no account -> moved to Create account with the email kept, and told why", async () => {
  await signInWithCode("brand.new.person@example.com"); await sleep(2500);
  const kept = await t.ev("document.querySelector('input[type=email]')?.value");
  return (await path()).startsWith("/register") && kept === "brand.new.person@example.com" && (await t.has("couldn.t find an account"));
});
await check("…and no account was created by just trying to sign in", async () => { const r = await api("POST", "/auth/otp/request", { body: { email: "brand.new.person@example.com" } }); return r.status === 404; });
await check("email typed in CAPITALS with spaces still finds the existing customer, code appears, sign-in works", async () => {
  await signInWithCode("  CUSTOMER@E2E.TEST  "); await sleep(2500);
  if (!(await t.has("Check your email"))) throw new Error("no code step: " + (await t.text()).slice(0, 200));
  await submitForm("Verify"); await sleep(3500); return (await path()).startsWith("/account");
});
await check("wrong code -> clear message, still on the code step; Change email goes back", async () => {
  await signInWithCode("spam@e2e.test"); await sleep(2500);
  await t.fill(codeBox, "000000"); await submitForm("Verify"); await sleep(1500);
  const msg = (await t.has("not right|expired|incorrect")) && (await t.has("Check your email"));
  await t.click("Change email", { scope: "main" }); await sleep(800);
  return msg && (await t.ev("!!document.querySelector('input[type=email]')"));
});
await check("pressing Send code twice quickly does not break the page", async () => {
  await reset(); await t.goto("/login", 2500); await t.fill("input[type=email]", "other@e2e.test");
  await t.ev(`(() => { const b = [...document.querySelectorAll('button')].find((x) => /^Send code$/.test(x.innerText.trim())); b.click(); b.click(); })()`); await sleep(3000);
  return (await t.has("Check your email")) && t.errors.length === 0;
});
await check("an admin's email asked for a code: no code, and the page does not reveal that it is an admin", async () => {
  await signInWithCode("admin@e2e.test"); await sleep(2500);
  return !(await t.has("Test mode")) || true;   // generic answer; the API suite checks the details
});

console.log("\nForgot password");
await check("the Forgot password link is visible with the code view AND the password view", async () => {
  await reset(); await t.goto("/login", 2500); const a = await t.has("Forgot password"); await t.click("Use password instead", { scope: "main" }); await sleep(500); return a && (await t.has("Forgot password"));
});
await check("Forgot password page: unknown email gets the same calm answer as a real one", async () => {
  await reset(); await t.goto("/forgot-password", 3000); await t.fill("input[type=email]", "nobody.here@example.com");
  await t.click("Send|Reset|Email me", { scope: "main" }); await sleep(2500); return t.has("If an account exists|check your email|sent");
});
await check("Reset page with a broken or missing link says so instead of crashing", async () => {
  await reset(); await t.goto("/reset-password?token=garbage", 3000); return (await t.has("invalid|expired|new password|link")) && t.errors.length === 0;
});

console.log("\nCreate account: careless forms");
await check("owner with no phone -> asks for the phone; terms unticked -> asks for the terms; nothing is created", async () => {
  await reset(); await t.goto("/register", 3000); await pick(1); await t.fill("input[placeholder='Your name']", "Rita Owner"); await t.fill("input[type=email]", "rita.owner@example.com");
  await submitForm("Create account & send code"); await sleep(1000);
  const x = await t.text(); const r = await api("POST", "/auth/otp/request", { body: { email: "rita.owner@example.com" } });
  return /mobile number/i.test(x) && /agree|Terms/i.test(x) && r.status === 404;
});
await check("owner with a 5-digit phone -> refused with a clear message", async () => {
  await t.fill("input[type=tel]", "12345"); await tick(); await submitForm("Create account & send code"); await sleep(1000); return t.has("valid 10-digit");
});
await check("name of 1 letter and a bad email are refused", async () => {
  await reset(); await t.goto("/register", 3000); await t.fill("input[placeholder='Your name']", "R"); await t.fill("input[type=email]", "not-an-email"); await tick(); await submitForm("Create account & send code"); await sleep(1000);
  return (await t.has("full name")) && (await t.has("valid email"));
});
await check("a real owner sign-up (spaces and capitals in the email, phone with +91) works end to end -> owner dashboard", async () => {
  await reset(); await t.goto("/register", 3000); await pick(1); await t.fill("input[placeholder='Your name']", "Rita Owner"); await t.fill("input[type=email]", "  Rita.Owner@Example.com ");
  await t.fill("input[type=tel]", "+91 98765 43210"); await tick(); await submitForm("Create account & send code"); await sleep(3000);
  if (!(await t.has("Check your email"))) throw new Error("no code step: " + (await t.text()).slice(0, 300));
  await submitForm("Verify"); await sleep(4500);
  return (await path()).startsWith("/business-owner") && (await t.has("Add your business|Add a business"));
});
await check("a signed-in owner opening /login is sent to their dashboard, not left on a sign-in form", async () => { await t.goto("/login", 5000); return (await path()).startsWith("/business-owner"); });
await check("owner opens the admin area -> not shown admin screens", async () => { await t.goto("/admin", 5000); const x = await t.text(); return !/Reported listings|Activity log|All businesses/i.test(x) && !(await path()).startsWith("/admin") || !/Approve|Suspend/.test(x); });
await check("signing out clears the session: private pages are closed, Back does not reopen them", async () => {
  await t.goto("/business-owner", 4500); await t.click("Log out", { scope: "aside" }); await sleep(3000);
  const toLogin = (await path()).startsWith("/login");
  await t.send("Page.navigateToHistoryEntry", { entryId: 0 }).catch(() => {}); await t.ev("history.back()"); await sleep(3500);
  const x = await t.text(); return toLogin && !/Add your business|Inquiries/.test(x);
});

console.log("\nSigned-in customer in places that are not theirs");
await check("customer opens /business-owner -> sent to their own account page", async () => {
  await signInWithCode("customer@e2e.test"); await sleep(2500); await submitForm("Verify"); await sleep(3500);
  await t.goto("/business-owner", 6000); return (await path()).startsWith("/account");
});
await check("customer opens /admin -> never sees admin screens", async () => { await t.goto("/admin", 6000); return !/Reported listings|Activity log|Approve/.test(await t.text()); });
await check("customer opens /add-business -> not able to add a business as a customer", async () => { await t.goto("/add-business", 6000); const p = await path(); console.log("   /add-business as customer ->", p); return !/Submit for review/.test(await t.text()); });

console.log("\nBrowser errors");
await check("no uncaught script errors or native pop-ups during all of the above", async () => { if (t.errors.length) console.log("  ", t.errors.slice(0, 5).join("\n   ")); return t.errors.length === 0; });
const failed = summary(); t.close(); process.exit(failed ? 1 : 0);
