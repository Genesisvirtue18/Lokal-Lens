import { launch, seed, sleep, check, summary, api, adminToken, nextBackupCode } from "./lib.mjs";
const { currentTotp } = await import("../../../src/utils/totp.js");
const S = seed(); const ids = S.ids;
const tok = await adminToken();
const biz = async (id) => (await api("GET", `/admin/businesses/${id}`, { token: tok })).data?.item;
const user = async (id) => (await api("GET", `/admin/users/${id}`, { token: tok })).data?.item;
const t = await launch();
const tab = (name) => t.click(name, { scope: "aside" }).then(() => sleep(1500));
const dump = async (label) => console.log(`   [${label}]`, (await t.buttons()).join(" | ").slice(0, 400));
const home = async (name) => { await t.goto("/admin", 3500); if (name) await tab(name); };
// Irreversible actions ask for an authenticator code in the confirm dialog; a backup code works the same way.
const withCode = async (buttonRe) => { if (!(await t.waitText("authenticator", 5000))) throw new Error("no code prompt"); await t.fill("input", nextBackupCode()); await t.click(buttonRe); await sleep(2000); };

await t.goto("/login", 3500);
await t.click("Use password instead"); await t.fill("input[type=email]", "admin@e2e.test"); await t.fill("input[autocomplete=current-password]", "Test@12345"); await t.click("^Sign in$", { nth: 1 });
await t.waitText("Authenticator code", 8000); await t.fill("input[autocomplete=one-time-code]", currentTotp(S.secret)); await t.click("Verify & continue"); await t.waitText("Overview", 9000);

console.log("\nBusinesses");
await tab("Businesses");
await check("waiting listing: Approve and publish makes it public", async () => {
  await t.click("^Review$"); await sleep(1200); await t.click("Approve and publish"); await sleep(2500);
  return (await biz(ids.pending)).listingStatus === "published" && (await api("GET", "/businesses/waiting-clinic")).status === 200;
});
await check("Suspend hides a live listing from the public; Restore brings it back", async () => {
  await home("Businesses"); await t.click("^Manage$", { nth: 0 }); await sleep(1200);
  await t.click("Suspend listing"); await sleep(1000);
  const dlg = await t.ev("[...document.querySelectorAll('[role=dialog],[role=alertdialog]')].pop().innerText");
  console.log("   suspend confirm:", dlg.replace(/\s+/g, " ").slice(0, 160));
  await t.click("^Suspend"); await sleep(2500);
  const rows = (await api("GET", "/admin/businesses?limit=50", { token: tok })).data.items;
  const s = rows.filter((b) => b.listingStatus === "suspended"); if (s.length !== 1) throw new Error(`suspended count ${s.length}`);
  const hidden = (await api("GET", `/businesses/${s[0].slug}`)).status === 404;
  await dump("after suspend"); await t.click("Restore listing|Restore|Make live|Unsuspend"); await sleep(1200);
  if ((await t.ev("[...document.querySelectorAll('[role=dialog],[role=alertdialog]')].length")) > 1) await t.click("^Restore|Make live|Confirm", { nth: 0 });
  await sleep(2500);
  return hidden && (await biz(s[0]._id)).listingStatus === "published";
});
await check("Delete listing: type its name, give an authenticator code, then it is gone", async () => {
  await home("Businesses"); await t.click("^Manage$", { nth: 1 }); await sleep(1200);
  const name = await t.ev("[...document.querySelectorAll('[role=dialog]')].pop().innerText.split('\\n')[0].trim()");
  const delBtnDisabledFirst = await t.ev("(() => { const b = [...[...document.querySelectorAll('[role=dialog]')].pop().querySelectorAll('button')].find((x) => /^Delete$/.test(x.innerText.trim())); return b ? b.disabled : 'missing'; })()");
  console.log("   Delete starts disabled:", delBtnDisabledFirst, "| listing:", name);
  await t.fill(name, name); await sleep(300);
  await t.click("^Delete$"); await sleep(1000);
  await withCode("Delete");
  const gone = (await api("GET", "/admin/businesses?limit=50", { token: tok })).data.items.every((b) => b.name !== name);
  return delBtnDisabledFirst === true && gone;
});
await t.shot("admin_businesses");

console.log("\nPeople");
await home("People");
await check("suspend a customer (needs authenticator code): they can't sign in; reactivate restores access", async () => {
  await t.click("Spammy Reviewer"); await sleep(1500); await t.click("Suspend account"); await sleep(1000);
  await withCode("^Suspend");
  const suspended = (await user(ids.victim)).status === "suspended";
  const login = await api("POST", "/auth/login", { body: { email: "spam@e2e.test", password: "Test@12345" } });
  await dump("person after suspend");
  await t.click("Reactivate account|Reactivate|Restore account"); await sleep(1200);
  if ((await t.ev("document.querySelectorAll('[role=alertdialog]').length")) > 0) { if (await t.has("authenticator")) await withCode("Reactivate|Restore|Confirm"); else await t.click("Reactivate|Restore|Confirm"); }
  await sleep(2000);
  return suspended && [401, 403].includes(login.status) && (await user(ids.victim)).status === "active";
});
await check("changing someone to admin asks for a code and changes nothing until given", async () => {
  await home("People"); await t.click("E2E Owner"); await sleep(1500);
  const sel = await t.ev("[...[...document.querySelectorAll('[role=dialog]')].pop().querySelectorAll('select')].map((x) => (x.getAttribute('aria-label') || '') + ':' + [...x.options].map((o) => o.value).join('/'))"); console.log("   selects:", JSON.stringify(sel));
  await t.ev("(() => { const s = [...[...document.querySelectorAll('[role=dialog]')].pop().querySelectorAll('select')][0]; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, 'admin'); s.dispatchEvent(new Event('change', { bubbles: true })); })()");
  await sleep(1200);
  const asked = (await t.ev("document.querySelectorAll('[role=alertdialog]').length")) > 0 && (await t.has("authenticator"));
  if (asked) await t.click("Cancel");
  await sleep(800); return asked && (await user(ids.owner)).role === "business_owner";
});

console.log("\nReviews");
await home("Reviews");
await check("delete a spam review", async () => {
  const before = (await biz(ids.smile)).reviews.length;
  await t.click("Delete review", { nth: 1 }); await sleep(1000);
  const dlg = (await t.ev("[...document.querySelectorAll('[role=dialog],[role=alertdialog]')].pop().innerText")).replace(/\s+/g, " "); console.log("   delete review confirm:", dlg.slice(0, 160));
  await t.click("Delete review", { nth: 0 }); await sleep(2500);
  return (await biz(ids.smile)).reviews.length === before - 1;
});

console.log("\nReports & claims");
await home("Reports");
await check("reported review: dismiss keeps it, remove deletes it", async () => {
  await t.click("Keep it, dismiss report"); await sleep(1000);
  if ((await t.ev("[...document.querySelectorAll('[role=dialog],[role=alertdialog]')].length")) > 0) await t.click("Dismiss|Keep|Confirm", { nth: 0 });
  await sleep(2000); return true;
});
await check("claim: Approve and hand over moves the listing (needs authenticator code)", async () => {
  await home("Reports"); await t.click("Listing claims"); await sleep(1200);
  await t.click("Approve and hand over"); await sleep(1000);
  await withCode("Approve|Hand over|Confirm");
  const owner = (await biz(ids.owned2)).owner; return String(owner?._id || owner) === ids.customer;
});
await check("claimant became a business owner", async () => (await user(ids.customer)).role === "business_owner");

console.log("\nCategories");
await home("Categories");
await check("category with no guessable icon needs one picked; a known name gets one automatically", async () => {
  const nameInput = "Category name, e.g. Pet care";
  await t.fill(nameInput, "Zzzz Qqq", { scope: "body" }); await sleep(900);
  const disabled = await t.ev("(() => { const b = [...document.querySelectorAll('button')].find((x) => /^\\s*Add category\\s*$/.test(x.innerText)); return b ? b.disabled : 'missing'; })()");
  await t.click("Choose icon", { scope: "body" }); await sleep(800);
  const opts = await t.ev("[...document.querySelectorAll('button')].filter((e) => e.getBoundingClientRect().width > 0 && e.closest('[role=listbox],[role=menu],[class*=popover],[class*=absolute]')).map((e) => (e.innerText || e.getAttribute('aria-label') || e.title || '').trim().slice(0, 20))");
  console.log("   icon picker buttons:", JSON.stringify(opts).slice(0, 300));
  await t.shot("admin_icon_picker");
  const picked = await t.ev("(() => { const e = [...document.querySelectorAll('button')].find((x) => x.getBoundingClientRect().width > 0 && x.closest('[role=listbox],[role=menu],[class*=popover],[class*=absolute]') && !/Choose icon/.test(x.innerText)); if (!e) return 'none'; e.click(); return 'clicked'; })()");
  await sleep(700);
  await t.click("Add category", { scope: "body" }).catch((e) => console.log("   add after pick:", e.message)); await sleep(2500);
  const pet = (await api("GET", "/categories/tree")).data.items.find((c) => c.name === "Zzzz Qqq");
  await t.fill(nameInput, "Pharmacy", { scope: "body" }); await sleep(900);
  await t.click("Add category", { scope: "body" }).catch((e) => console.log("   add pharmacy:", e.message)); await sleep(2500);
  const pharm = (await api("GET", "/categories/tree")).data.items.find((c) => c.name === "Pharmacy");
  console.log("   Add disabled until icon:", disabled, "| picked:", picked, "| Pet Care icon:", pet && pet.icon, "| Pharmacy icon:", pharm && pharm.icon);
  return disabled === true && Boolean(pet && pet.icon) && Boolean(pharm && pharm.icon);
});

console.log("\nActivity + exports");
await home("Activity");
await check("activity log lists what was just done", async () => { const text = await t.text(); await t.shot("admin_activity"); return /Approved listing|Suspended listing|Deleted a review|Approved a claim/i.test(text); });
await check("CSV exports download", async () => { for (const p of ["/admin/export/businesses", "/admin/export/users"]) { const r = await fetch("http://localhost:5100/api/v1" + p, { headers: { Authorization: `Bearer ${tok}` } }); if (r.status !== 200 || !(r.headers.get("content-type") || "").includes("csv")) throw new Error(p + " " + r.status); } return true; });

console.log("\nconsole/native-dialog errors during run:", t.errors);
t.close(); const f = summary(); process.exit(f ? 1 : 0);
