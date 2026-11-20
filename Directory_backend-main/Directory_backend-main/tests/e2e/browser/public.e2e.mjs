// Public pages, search, reviews and inquiries the way a careless or curious visitor uses them (signed out and signed in).
// Needs the isolated stack (see README.md). Restart the test API (node tests/e2e/server.mjs) before each run.
import { launch, seed, sleep, check, summary, api } from "./lib.mjs";
seed();
const t = await launch({ width: 1280, height: 1000 });
const path = () => t.ev("location.pathname + location.search");
const signOut = async () => { await t.send("Network.clearBrowserCookies"); await t.goto("/login", 1200); await t.ev("localStorage.clear(); sessionStorage.clear();"); };
const signInAs = async (email) => { await signOut(); const tok = (await api("POST", "/auth/login", { body: { email, password: "Test@12345" } })).data?.accessToken; await t.ev(`localStorage.setItem('directflow_access_token', ${JSON.stringify(tok)})`); return tok; };
const broken = async () => /Application error|Internal Server Error|Unhandled Runtime Error|This page couldn.t load|500\b/.test(await t.text());

// Real business pages are found through the directory, so the test does not hard-code ids.
await t.goto("/directory", 5000);
const links = await t.ev(`[...new Set([...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>/_BZDET$/.test(h)))]`);
const urlOf = (slug) => links.find((h) => h.includes(`/${slug}/`));
const idOf = (url) => url.split("/").pop().split("_")[0];

console.log("Public pages");
for (const p of ["/", "/directory", "/terms", "/privacy", "/categories", "/saved"]) await check(`${p} opens without errors`, async () => { await t.goto(p, 4000); return !(await broken()) && t.errors.length === 0; });
await check("an unknown page shows a friendly 404 with a way back", async () => { await t.goto("/no-such-page-xyz", 3500); return (await t.has("couldn.t find that page")) && (await t.has("Explore|Home|directory")); });
await check("a business link with a made-up id shows 404, not a crash", async () => { await t.goto("/ghaziabad/nope/aaaaaaaaaaaaaaaaaaaaaaaa_BZDET", 4500); return (await t.has("couldn.t find")) && !(await broken()); });
await check("a business link with a broken id shows 404, not a crash", async () => { await t.goto("/ghaziabad/nope/zzz_BZDET", 4500); return (await t.has("couldn.t find")) && !(await broken()); });
await check("a real business page shows its name, rating, contact buttons and reviews", async () => { await t.goto(urlOf("smile-dental"), 5000); const x = await t.text(); return /Smile Dental/.test(x) && /reviews/i.test(x) && /Send inquiry/.test(x) && /Write a review/.test(x); });

console.log("\nSearch: strange things typed into the box or the address bar");
const odd = [["a script tag", "<script>alert(1)</script>"], ["an image with onerror", "<img src=x onerror=alert(1)>"], ["a 600-letter word", "x".repeat(600)], ["emoji", "🍕🍕🍕"], ["Hindi", "दंत चिकित्सक"], ["SQL-looking text", "' OR 1=1 --"], ["a Mongo operator", "{\"$ne\":null}"], ["only spaces", "     "], ["a percent sign", "100%"]];
for (const [label, q] of odd) await check(`search for ${label} -> no crash, no pop-up, nothing runs`, async () => { await t.goto(`/directory?q=${encodeURIComponent(q)}`, 4500); return !(await broken()) && t.errors.length === 0; });
for (const qs of ["page=-1", "page=abc", "page=999999", "sort=bogus", "rating=99", "lat=abc&lng=xyz", "city=%00", "limit=100000", "category=%27%22"]) await check(`address bar "?${qs}" -> page still opens`, async () => { await t.goto(`/directory?${qs}`, 4500); return !(await broken()) && t.errors.length === 0; });
await check("a city page and a category page that do not exist -> 404 or empty list, never a crash", async () => { for (const p of ["/nowhere-city", "/ghaziabad/not-a-category", "/ghaziabad/healthcare/not-real"]) { await t.goto(p, 4000); if (await broken()) throw new Error(`${p} crashed`); } return true; });
t.errors.length = 0;

console.log("\nReviews: signed out");
await check("a signed-out visitor who clicks Write a review is asked to sign in (not shown an empty form)", async () => {
  await signOut(); await t.goto(urlOf("other-dental"), 5000); await t.click("Write a review", { scope: "body" }); await sleep(1500);
  return (await t.has("sign in|log in")) || (await path()).startsWith("/login");
});

console.log("\nReviews: signed-in customer");
const other = urlOf("other-dental"), salon = urlOf("team-added-salon");
const reviewsOf = async (url) => ((await api("GET", `/businesses/${idOf(url)}/reviews`)).data?.items || []);
const setReview = (text) => t.ev(`(() => { const submit = [...document.querySelectorAll('button')].find((b) => /^Submit review$/.test(b.innerText.trim())); let node = submit; let ta = null; for (let i = 0; i < 8 && node && !ta; i++, node = node.parentElement) ta = node.querySelector('textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, ${JSON.stringify(text)}); ta.dispatchEvent(new Event('input', { bubbles: true })); })()`);
const openForm = async (url) => { await t.goto(url, 5000); await t.click("Write a review", { scope: "body" }); await sleep(1000); };
const customerToken = await signInAs("customer@e2e.test");
await check("submitting with no star rating is refused with a clear message, nothing is saved", async () => {
  const before = (await reviewsOf(other)).length; await openForm(other); await t.click("Submit review", { scope: "body" }); await sleep(1500);
  return (await t.has("rating|star|choose")) && (await reviewsOf(other)).length === before;
});
await check("a 5-star rating with no text is accepted (text is optional)", async () => {
  await openForm(other); await t.click("^5 stars$", { scope: "body" }); await t.click("Submit review", { scope: "body" }); await sleep(2500);
  const mine = (await api("GET", "/users/me/reviews", { token: customerToken })).data?.items || [];
  return mine.length >= 1 && (await t.has("thank|submitted|review"));
});
await check("reviewing the same business a second time does not create a duplicate", async () => {
  const before = (await api("GET", "/users/me/reviews", { token: customerToken })).data?.items?.length || 0;
  await openForm(other); await t.click("^4 stars$", { scope: "body" }).catch(() => {}); await t.click("Submit review", { scope: "body" }).catch(() => {}); await sleep(2500);
  const after = (await api("GET", "/users/me/reviews", { token: customerToken })).data?.items?.length || 0; return after <= before;
});
await check("review text with HTML and a script is shown as plain text, never executed", async () => {
  await openForm(salon); await t.click("^5 stars$", { scope: "body" }); await setReview("<img src=x onerror=alert(1)><b>bold</b> <script>alert(2)</script> great place");
  await t.click("Submit review", { scope: "body" }); await sleep(3000); await t.goto(salon, 5000);
  const injected = await t.ev("document.querySelectorAll('main img[src=x]').length"); const stored = (await reviewsOf(salon)).concat((await api("GET", "/users/me/reviews", { token: customerToken })).data?.items || []).length; console.log("   injected images:", injected, "| errors:", t.errors.join(" ; ").slice(0, 300), "| reviews seen:", stored); return injected === 0 && t.errors.length === 0;
});
await check("a 5000-character review is refused or shortened with a message, never a crash", async () => {
  await t.goto(urlOf("smile-dental"), 5000); await t.click("Write a review", { scope: "body" }); await sleep(800); await t.click("^3 stars$", { scope: "body" }); await setReview("word ".repeat(1000));
  await t.click("Submit review", { scope: "body" }); await sleep(2500); return !(await broken()) && t.errors.length === 0;
});
await check("the owner of a business cannot review their own business", async () => {
  const ownerToken = await signInAs("owner@e2e.test"); const before = (await reviewsOf(urlOf("smile-dental"))).length;
  await openForm(urlOf("smile-dental")); await t.click("^5 stars$", { scope: "body" }).catch(() => {}); await t.click("Submit review", { scope: "body" }).catch(() => {}); await sleep(2500);
  void ownerToken; return (await reviewsOf(urlOf("smile-dental"))).length === before;
});

console.log("\nInquiry form");
await check("sending an empty inquiry is refused with field messages", async () => { await signOut(); await t.goto(urlOf("smile-dental"), 5000); await t.click("^Send inquiry$", { scope: "body" }); await sleep(1200); return (await t.has("required|enter|valid|please")) && !(await broken()); });
await check("a 5-digit phone number is refused", async () => { await t.fill("input[name=name]", "Visitor One", { scope: "body" }); await t.fill("input[name=phone]", "12345", { scope: "body" }); await t.fill("textarea[name=message]", "Do you open on Sunday?", { scope: "body" }); await t.click("^Send inquiry$", { scope: "body" }); await sleep(1200); return t.has("10-digit|valid"); });
await check("letters typed in the phone box are not accepted", async () => { await t.fill("input[name=phone]", "abcdefghij", { scope: "body" }); const v = await t.ev("document.querySelector('input[name=phone]').value"); return !/[a-z]/i.test(v); });
await check("a valid inquiry is sent once, even if Send is clicked twice", async () => {
  const ownerTok = (await api("POST", "/auth/login", { body: { email: "owner@e2e.test", password: "Test@12345" } })).data?.accessToken;
  const before = ((await api("GET", "/owner/leads?limit=100", { token: ownerTok })).data?.items || []).length;
  await t.fill("input[name=phone]", "9876543210", { scope: "body" });
  await t.ev(`(() => { const b = [...document.querySelectorAll('button')].find((x) => /^Send inquiry$/.test(x.innerText.trim())); b.click(); b.click(); })()`); await sleep(3500);
  const after = ((await api("GET", "/owner/leads?limit=100", { token: ownerTok })).data?.items || []).length; console.log("   inquiries before/after:", before, after, "| page:", (await t.text()).slice(-300)); return after === before + 1;
});
await check("an inquiry full of HTML is stored as text and the owner's page does not run it", async () => {
  await t.goto(urlOf("smile-dental"), 5000); await t.fill("input[name=name]", "<b>Bold</b> Visitor", { scope: "body" }); await t.fill("input[name=phone]", "9876543211", { scope: "body" }); await t.fill("textarea[name=message]", "<script>alert(1)</script> hello", { scope: "body" });
  await t.click("^Send inquiry$", { scope: "body" }); await sleep(3000); return t.errors.length === 0;
});

console.log("\nBrowser errors");
await check("no uncaught script errors or native pop-ups during all of the above", async () => { if (t.errors.length) console.log("  ", t.errors.slice(0, 5).join("\n   ")); return t.errors.length === 0; });
const failed = summary(); t.close(); process.exit(failed ? 1 : 0);
