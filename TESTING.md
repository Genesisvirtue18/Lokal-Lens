# Lokal Lens: poora manual test (ek ek cheez)

Har item ka format: **kya karo → kya dikhna chahiye**. Jo item fail ho, uske saamne X lagao aur screenshot rakho.

## 0. Pehle taiyari

1. Backend aur frontend dono chalao (`npm run dev` dono folders mein). Backend `.env` mein MAIL_*, GOOGLE_SIGNIN_CLIENT_ID; frontend `.env.local` mein NEXT_PUBLIC_GOOGLE_CLIENT_ID hona chahiye.
2. Mail check: backend folder se `node scripts/send-test-email.js aapka@gmail.com` → "Sent" aana chahiye.
3. **Teen alag browser profile / incognito window** rakho: Customer, Owner, Admin. Ek hi browser mein ek saath do role login mat rakho.
4. Test accounts (sirf local): `owner@lokallens.test`, `customer@lokallens.test` (password `Test@12345`).
5. **Admin ke liye apna naya admin banao** (purana test admin ka authenticator mere paas tha):
   `ADMIN_EMAIL=aapki@gmail.com ADMIN_NAME="Aapka Naam" ADMIN_PASSWORD='lamba-password' node scripts/create-admin.js`
   Pehli baar login par QR dikhega, Google Authenticator se scan karo, backup codes **save** karo.
6. Ek Gmail alag se rakho (Google login aur email test ke liye). Wo Google Console ke "Test users" mein honi chahiye.

---

## 1. Public pages (bina login)

| # | Kya karo | Kya dikhna chahiye |
|---|---|---|
| 1.1 | `/` home kholo | Hero, search box, categories, featured listings, offers, "Discover by area". Koi error nahi, images dikhein |
| 1.2 | Search box mein "dentist" likho, city chuno, Search | `/directory` par results, "Results for dentist" |
| 1.3 | Search mein bakwaas "zzzqq" | "No results" wala saaf message, "Clear filters" button |
| 1.4 | `/directory` par filters: Open now, Verified, Rating 4+, Area | Results badalte hain, count badalta hai, filter hataane par wapas |
| 1.5 | Sort: Relevance / Rating | Order badalta hai |
| 1.6 | Grid/List view | Dono chalte hain |
| 1.7 | Load more / pagination | Agla page aata hai |
| 1.8 | `/categories` | Saari categories icon ke saath, click karo → us category ki list |
| 1.9 | `/ghaziabad` (city page) | "Lokal Lens lists N local businesses in Ghaziabad..." paragraph, categories ki list |
| 1.10 | City page se category click | `/ghaziabad/healthcare/nct-...` par **listings dikhni chahiye** (0 results nahi), neeche "About healthcare in Ghaziabad" paragraph |
| 1.11 | `/ghaziabad/healthcare` seedha kholo | Apne aap `/nct-...` wale address par chala jaye |
| 1.12 | `/offers` | Live offers, city filter |
| 1.13 | `/ask` | Sawaal likho, matching listings aaye |
| 1.14 | `/terms`, `/privacy` | Dono khulein, footer aur sign-up se link ho |
| 1.15 | Galat address `/kuch-nahi-hai` | "We couldn't find that page" (404), blank page nahi |
| 1.16 | Footer ke saare links | Koi dead link nahi |

### Listing page (kisi bhi business par click karo)
| # | Kya karo | Kya dikhna chahiye |
|---|---|---|
| 1.20 | Photos, naam, rating, "Open until", address, services, hours | Sab sahi aur poora |
| 1.21 | Photos gallery "All photos" | Lightbox khule, band ho |
| 1.22 | **Call** button | Confirm dialog, "Continue" par dialer khule |
| 1.23 | **WhatsApp** button (jis listing mein WhatsApp number ho) | Dialog, phir wa.me khule aur message pehle se likha ho: "Hi, I found X on Lokal Lens..." |
| 1.24 | Get directions / Website | Naya tab |
| 1.25 | Save (heart) | Saved ho jaye, `/saved` mein dikhe |
| 1.26 | Share | Link copy ho |
| 1.27 | Inquiry form: bina login naam, phone, message bharo, **Send inquiry** | "Your inquiry was sent". Phone mein letters type nahi hone chahiye |
| 1.28 | Inquiry form mein galat/chhota phone | Error, bheja na jaye |
| 1.29 | Mobile par listing page (browser ko chhota karo / phone par kholo) | Sideways scroll nahi, neeche Call bar, amenities 2 column |
| 1.30 | "Report this listing" (bina login) | Login page par bhejna chahiye |
| 1.31 | Review "Write a review" (bina login) | Login maange |

---

## 2. Sign-up, login (har tareeka)

| # | Kya karo | Kya dikhna chahiye |
|---|---|---|
| 2.1 | `/register` → "I'm looking for businesses" + naam + email + (phone) + terms tick → Create account & send code | Mail aaye (naye design mein, bada code). Code daalo → seedha `/account` |
| 2.2 | `/register` → "I own a business": phone **zaroori** | Phone khali chhodo to error; sahi do to chale; login ke baad `/business-owner` |
| 2.3 | Terms tick kiye bina | Error "Please agree..." |
| 2.4 | Galat email / chhota naam | Field ke neeche saaf error |
| 2.5 | Wahi email dobara register | "An account with this email already exists" |
| 2.6 | Wahi phone doosre account se | "mobile number is already used" |
| 2.7 | Galat code 3 baar | Error, 5 galat par naya code maange |
| 2.8 | Code 10 min baad | "This code has expired" |
| 2.9 | "Use password instead": password se register | Pehle email code se confirm, phir login |
| 2.10 | Login: email + password | Sahi par andar; galat par "Invalid email or password" |
| 2.11 | 8 baar galat password | "Too many wrong attempts" (lock), thodi der baad khule |
| 2.12 | "Forgot password?" | Reset mail aaye (button wala), link se naya password lage, purana band |
| 2.13 | **Continue with Google** (login tab, nayi Gmail) | Popup → Gmail chuno → "customer ya owner?" poochhe → account ban jaye |
| 2.14 | Google (Create account tab, "owner" pehle se chuna) | Seedha account (owner), phone poochhe |
| 2.15 | Wahi Gmail se dobara Google login | Seedha login, naya account nahi |
| 2.16 | Pehle email se bana account, phir usi email ki Gmail se Google | Wahi account khule |
| 2.17 | Admin ki email se Google try | "Admins sign in with a password and an authenticator" |
| 2.18 | Log out | Login page, dobara dashboard kholo to login maange |
| 2.19 | Token expire (15 min baad kuch karo) | Apne aap naya token ya login par bheje, error screen nahi |

---

## 3. Customer (`/account`)

| # | Kya karo | Kya dikhna chahiye |
|---|---|---|
| 3.1 | Login karke dashboard | Overview: Saved, Reviews, Inquiries ke counts |
| 3.2 | Listing par heart | Saved tab mein dikhe, doosre device/browser mein login par bhi dikhe |
| 3.3 | Saved se Remove | Hat jaye |
| 3.4 | Listing par **inquiry bhejo** (login ke saath) | Naam/phone/email **pehle se bhare**; bhejne par "My inquiries" mein dikhe, status "Sent" |
| 3.5 | Confirmation email | Mail aaye: details table, aapka message, "Follow my inquiries" button |
| 3.6 | Owner reply kare (section 4) | "My inquiries" mein reply dikhe (neele box mein), mail bhi aaye |
| 3.7 | **Withdraw** | "Withdrawn" badge, owner ab reply nahi kar paye |
| 3.8 | Review likho (listing par, 1-5 star + comment) | "My reviews" mein dikhe |
| 3.9 | Wahi listing par dobara review | Purana update ho, naya na bane |
| 3.10 | My reviews → Edit review | Listing ke review section par le jaye |
| 3.11 | My reviews → Delete | Confirm, hat jaye, rating dobara hisaab |
| 3.12 | Kisi review par Report | Reason chuno, "Thanks" |
| 3.13 | **Report this listing** (login ke saath) | Reason chuno → "Thanks for letting us know" |
| 3.14 | Account: naam badlo (digits na jayein) | Save ho |
| 3.15 | Password badlo (galat current → error, sahi → badle) | Doosre devices logout |
| 3.16 | Account: Sessions list, "Sign out" kisi device ko | Wo device logout |
| 3.17 | Two-step verification **Turn on** (authenticator scan) | Backup codes dikhein; ab login par code maange; Turn off bhi chale |
| 3.18 | Delete my account ("DELETE" type) | Logout, dobara login na ho |
| 3.19 | Mobile par `/account` | Neeche tab bar, sab tab khulein, sideways scroll nahi |

---

## 4. Business Owner (`/business-owner`)

| # | Kya karo | Kya dikhna chahiye |
|---|---|---|
| 4.1 | Login → Overview | Listings, views, inquiries, rating ke cards, profile % complete |
| 4.2 | **Add a business**: Step 1 (naam, category → subcategory, description 80+ akshar) | Galat/khali par red error, Continue na ho |
| 4.3 | Step 2 Location: address, city, state, PIN | PIN sirf 6 digit (letters na jayein); "Use my live location" / "Find from address" se map pin |
| 4.4 | Step 3: services add (naam, price), hours | Opening time ke baad closing; closing pehle ho to error; koi minute chuna ja sake |
| 4.5 | Step 4: phone, email, WhatsApp, website, photos | Phone mein letters nahi; galat email/website par error; alternate phone = main phone par error |
| 4.6 | Step 5 Preview → **Submit for review** | "Thanks, we're reviewing"; listing "In review"; public par nahi dikhti |
| 4.7 | Admin approve kare (section 5) | Mail aaye "now live"; listing public ho |
| 4.8 | **Edit** (sirf description badlo) | Turant live, review mein nahi jati |
| 4.9 | **Edit: naam / phone / category / city badlo** | Save ke baad "our team will check again" message; listing "In review", public se hat jaye; admin ko "Changed: name" note dikhe |
| 4.10 | Pause / Resume | Public se hat/aa jaye |
| 4.11 | Delete (naam type karo) | Hat jaye |
| 4.12 | Verified badge: email confirm + GST/document | Admin approve kare to badge |
| 4.13 | **Inquiries** tab | Nayi inquiry dikhe (naam, phone, message), status New |
| 4.14 | Status Contacted/Converted | Badle; customer ko mail jaye |
| 4.15 | Lead kholo → **Reply to customer** likho, Send | Customer ke My inquiries mein dikhe; status Contacted; "Replied" badge |
| 4.16 | Follow-up note | Sirf owner ko dikhe, customer ko nahi |
| 4.17 | Customer ne withdraw kiya ho | "Withdrawn by customer", reply box ki jagah message |
| 4.18 | Inquiry Export CSV | File download |
| 4.19 | **Reviews** tab: Reply, Report | Reply listing page par dikhe |
| 4.20 | **Offers**: naya offer (title, valid until, code) | `/offers` aur listing par dikhe; expire ke baad hat jaye |
| 4.21 | **Analytics**: 7/30/90 din | Views, calls, WhatsApp, directions ke asli numbers; listing par kuch click karo to badhein |
| 4.22 | Account: naam, password, 2FA, notification toggle | Sab chale |
| 4.23 | Kisi listing par "Claim this listing" (doosre owner ki) | Owner ko mail + dashboard par "Someone asked to claim" |
| 4.24 | Us claim par "This isn't right" | Admin ko dikhe |
| 4.25 | Mobile par owner dashboard | Neeche 6 tab, har tab fit, reply/pause kaam kare |

---

## 5. Admin (`/admin`)

| # | Kya karo | Kya dikhna chahiye |
|---|---|---|
| 5.1 | Login: password → authenticator code | Dashboard; galat code par error; same code dobara (30 sec ke andar) na chale |
| 5.2 | Backup code se login | Chale, wo code dobara na chale |
| 5.3 | Overview | Counts, waiting listings |
| 5.4 | **Businesses**: search, filter, "Review" waiting listing → **Approve and publish** | Public ho, owner ko mail |
| 5.5 | Reject (reason likho) | Owner ko reason ke saath mail |
| 5.6 | Waiting listing jo "Sent back for review" ho | Note dikhe: "Changed: name. Was ..." |
| 5.7 | Manage → **Suspend listing** | Public se hat, owner ko mail; **Restore** se wapas |
| 5.8 | Delete (naam type + authenticator code) | Hat jaye; bina code ke na ho |
| 5.9 | Bulk: kuch listings select → Suspend / Restore / Delete / Assign to owner | Sab ek saath badle |
| 5.10 | **Edit all details** (admin form) | Owner jaisa form, save ho |
| 5.11 | Add business / Bulk upload CSV | Naya listing / invalid rows ki list |
| 5.12 | Export CSV | File download |
| 5.13 | **People**: kisi ko kholo (listings, reviews dikhe) | Sahi jaankari |
| 5.14 | Suspend account (code chahiye) | Wo login na kar paye; Reactivate se wapas |
| 5.15 | Role badlo (admin banane par code) | Bina code ke na badle |
| 5.16 | Owner ki saari listings Pause/Delete | Sab par laage |
| 5.17 | **Reviews** tab: Delete review | Rating dobara hisaab |
| 5.18 | **Reports & claims**: Reported reviews (Remove / Dismiss) | Chale |
| 5.19 | **Reported listings** (customer ne report ki): Suspend / Handled / Dismiss | Chale; suspend par saari open reports band |
| 5.20 | **Listing claims**: dekho proof ("verified by email" badge, owner ka dispute) | Sab dikhe |
| 5.21 | Claim Approve and hand over (code chahiye) / Reject | Listing claimant ke paas / mail |
| 5.22 | **Inquiries** tab: saari inquiries | Business, owner dikhe |
| 5.23 | **Categories**: Add (naam likho) | Icon apne aap chune ("Pharmacy" → pill); bekaar naam par icon khud chunna padta hai |
| 5.24 | Category rename / hide / delete (code) | Chale |
| 5.25 | **Activity** | Har admin action ki line (kisne, kya) |
| 5.26 | Account & security: 2FA band nahi ho sakta | "Admin accounts must keep this on" |
| 5.27 | Mobile par admin | Neeche scroll hone wali tab bar, Manage drawer, Suspend/Restore chale |

---

## 6. Emails (har ek ka design dekho)

`node scripts/preview-emails.js` chalao aur `tmp/email-previews/index.html` kholo. Phir asli test:

| # | Kab aati hai | Dekho |
|---|---|---|
| 6.1 | Sign-up / login code | Bada code, "Expires in 10 minutes" |
| 6.2 | Password reset | "Choose a new password" button |
| 6.3 | Claim code (listing ke email par) | Code, listing ka naam |
| 6.4 | Owner ko nayi inquiry | Details table, message, "Open your dashboard" |
| 6.5 | Owner ko naya review | Stars, comment |
| 6.6 | Customer ko inquiry confirmation | "Follow my inquiries" ya "Create a free account" |
| 6.7 | Owner ka reply | Reply quote mein |
| 6.8 | Listing approve / reject / suspend / claim approve | Sahi subject aur button |
| 6.9 | Gmail mein **Spam** folder bhi dekho | Inbox mein aani chahiye |
| 6.10 | Phone ke Gmail app mein khol kar dekho | Layout tuta nahi, button dabta hai |

---

## 7. Security (ek baar zaroor)

| # | Kya karo | Kya dikhna chahiye |
|---|---|---|
| 7.1 | Customer login karke `/admin` kholo | Admin nahi dikhta (login/ghar par bheje) |
| 7.2 | Customer `/business-owner` kholo | `/account` par chala jaye |
| 7.3 | Owner A ki listing ka `?edit=<id>` URL owner B ke login se kholo | Nahi khule |
| 7.4 | Owner apni listing "published" ya "verified" kar sake? (form mein aisa option nahi) | Nahi |
| 7.5 | Phone/naam mein `<script>alert(1)</script>` daalo | Text dikhe, script na chale |
| 7.6 | Logout ke baad browser Back dabao | Dashboard ka data na dikhe |
| 7.7 | Login ke 15 min baad (ya token mita kar) refresh | Dobara login/refresh, crash nahi |
| 7.8 | Admin ka koi destructive kaam bina authenticator code | Nahi hota |
| 7.9 | Website ko `https` par kholo (live) | Padlock, mixed-content warning nahi |

---

## 8. Live (Vercel + Render) par ek baar ye sab

- [ ] Render: CLIENT_URL = Vercel URL, MAIL_*, GOOGLE_SIGNIN_CLIENT_ID, TRUST_PROXY, naye JWT secrets, Atlas MONGODB_URI, Cloudinary
- [ ] Vercel: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_GOOGLE_CLIENT_ID
- [ ] Live par `create-admin.js` chalao, `assign-listings-to-owner.js` chalao
- [ ] Section 1, 2 (Google sahit), 3, 4, 5 ek baar live par bhi
- [ ] `/sitemap.xml` aur `/robots.txt` khulte hain; Search Console mein sitemap daala
- [ ] Render pehli request mein dheere (so jata hai): paid plan ya ping lagao

---

## Automated tests (code ko khud jaanchne ke liye)

- Backend: `cd Directory_backend-main && npm test` → sab pass.
- Browser suites (alag test API par, aapka data nahi chhuta): `tests/e2e/README.md` dekho. Ek frontend `next dev -p 3100` alag se chalta hai, phir `node tests/e2e/browser/run-all.mjs`.
