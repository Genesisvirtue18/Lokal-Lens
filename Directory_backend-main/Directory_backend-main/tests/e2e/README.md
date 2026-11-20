# Browser tests

These click through the real website in headless Chrome (no extra npm packages) against an **isolated** copy of the API, so deleting or
suspending things never touches real data.

| Piece | What it is |
| --- | --- |
| `server.mjs` | API on port **5100** with an in-memory MongoDB and seeded accounts (admin with an authenticator + backup codes, two owners, customers), listings, reviews, an inquiry, a review report and a listing claim. |
| `browser/admin.e2e.mjs` | Admin signs in with password + authenticator code, then approves/suspends/deletes listings, suspends people, changes roles, deletes/reports reviews, approves claims, adds categories, reads the activity log, exports CSV. |
| `browser/owner.e2e.mjs` | Owner signs in, adds a business through all 5 wizard steps, edits, pauses/resumes, replies to a review, handles an inquiry, adds an offer, opens analytics, changes name and password, deletes a listing. |
| `browser/features.e2e.mjs` | Public pages (Terms, city and category pages with their written summaries), a signed-in customer's pre-filled inquiry, WhatsApp message, reporting a listing, owner reply, withdrawing, and the admin's Reported listings tab. |
| `browser/mobile.e2e.mjs` | The owner, customer and admin screens on a 390 px phone: nothing scrolls sideways and the main buttons work. |
| `browser/visitor.e2e.mjs` | A careless visitor on the sign-in and sign-up pages: unknown or odd emails, wrong codes, forgot password, private pages while signed out, Back after sign-out, other people's areas. |
| `browser/public.e2e.mjs` | Public pages, odd searches and address-bar values, reviews (no stars, duplicates, HTML), the inquiry form (empty, bad phone, double click). |
| `browser/validation.e2e.mjs` | Forms refuse bad data: letters in PIN/phone, 5-digit PIN, closing time before opening time, bad email, `javascript:` website. |

## Run

1. Start the frontend pointed at the test API (own build folder, so it can run next to your normal dev server):
   `NEXT_DIST_DIR=.next-e2e NEXT_PUBLIC_API_URL=http://localhost:5100/api/v1 npx next dev -p 3100`
2. From `Directory_backend-main`: `node tests/e2e/browser/run-all.mjs` (or add `admin`, `owner`, `features`, `validation` or `mobile`).

Chrome is expected at `C:/Program Files/Google/Chrome/Application/chrome.exe`; set `CHROME_PATH` otherwise.
Screenshots from the last run are written to `tests/e2e/browser/out/`.

## Things that make a run look broken when it is not

- **Do not start `server.mjs` yourself before `run-all.mjs`.** The runner starts its own API for each suite; on Windows two servers can share port 5100 and the ids no longer match.
- `visitor` and `public` are run directly (`node tests/e2e/browser/visitor.e2e.mjs`), so start the API first and restart it before every run (they create accounts and reviews).
- If the frontend was started before the API was reseeded, Next can serve business ids cached from an older API (symptom: "Business not found" on the inquiry form). Restart the test frontend on port 3100.
