# Going live: Lokal Lens

Three pieces: **MongoDB Atlas** (database) → **Render** (API) → **Vercel** (website). All have a free tier to start.

## 0. Before you start
- Put the project on GitHub (one repo with the whole folder). Never commit `.env` files; `.gitignore` already blocks them.
- Make accounts: GitHub, MongoDB Atlas, Render, Vercel, and an email sender (Brevo or Gmail SMTP) and Cloudinary (photos).

## 1. Database (MongoDB Atlas)
1. Create a free **M0** cluster. Create a database user (username + password).
2. *Network Access* → add `0.0.0.0/0` (Render's address changes).
3. *Connect → Drivers* → copy the connection string. Replace `<password>`; add the database name, e.g. `.../business_directory?retryWrites=true&w=majority`.
4. Move your local data (the 178 listings, categories) to Atlas, from your PC:
   ```
   mongodump --uri="mongodb://127.0.0.1:27017/business_directory" --out=dump
   mongorestore --uri="<atlas connection string>" --nsInclude="business_directory.*" dump
   ```
   Skip the `users`, `refreshtokens` and `businessdailystats` collections if you want a clean start (delete those folders from `dump` first).

## 2. API (Render)
1. *New → Web Service* → pick the repo. **Root directory:** `Directory_backend-main/Directory_backend-main`. Build `npm install`, start `npm start`. (Or *New → Blueprint*; `render.yaml` is included.)
2. Environment variables:
   | Name | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | the Atlas string |
   | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | two different random strings, 32+ characters |
   | `CLIENT_URL` | your site address, no trailing `/` (e.g. `https://lokallens.in`) |
   | `TRUST_PROXY` | `1` |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | from your email provider. **Required**: login codes are sent by email. |
   | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | from Cloudinary. **Required** for photo uploads (Render's disk is wiped on restart). |
3. Deploy. Open `https://<your-api>.onrender.com/api/v1/health`: it should say ok.

## 3. Website (Vercel)
1. *Add New → Project* → same repo. Root directory = the repo root (where `package.json` is). Framework: Next.js.
2. Environment variables: `NEXT_PUBLIC_API_URL` = `https://<your-api>.onrender.com/api/v1`, `NEXT_PUBLIC_SITE_URL` = your site address.
3. Deploy. Then add your domain under *Settings → Domains*.
4. Go back to Render and set `CLIENT_URL` to the final site address (CORS depends on it). Redeploy the API.

## 4. First admin
Test accounts do not exist in production. Create your own admin once (from your PC, with `MONGODB_URI` pointing at Atlas in `Directory_backend-main/Directory_backend-main/.env`, or in the Render shell):
```
cd Directory_backend-main/Directory_backend-main
ADMIN_EMAIL=you@example.com ADMIN_NAME="Your Name" ADMIN_PASSWORD='a-long-password-123' node scripts/create-admin.js
```
Sign in at `/login` → "Use password instead". Admin page: `/admin`.

## 5. Final check (5 minutes)
- [ ] Home, Directory, a business page load; photos show.
- [ ] Search and "Use my location" work (site must be on **https**).
- [ ] Sign up a new owner: the email code arrives in the inbox.
- [ ] Add a business → admin approves it at `/admin` → it appears in search.
- [ ] Inquiry from a business page reaches the owner (dashboard + email).

## Things to know
- Free Render sleeps after ~15 min idle; the first request then takes ~30-60 s. Use a paid instance (about $7/month) for real use.
- In production the login page's "Test accounts" box, on-screen email codes, and `/design-check` are switched off automatically.
- Existing listing photos come from Google image links and keep working; new uploads go to Cloudinary.
- Back up Atlas regularly (free tier has no automatic backups; paid tiers do).

## Security settings (read before going live)
- **Sign-in sessions.** The long-lived refresh token is stored in an httpOnly cookie, not in the browser's storage. The website and the API sit on different sites (Vercel and Render), so the cookie is sent with `SameSite=None; Secure`. If you later put both under one domain (for example `lokallens.in` and `api.lokallens.in`), set `COOKIE_SAMESITE=lax` on Render.
- **Admins sign in in two steps:** password, then a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator, Authy). The first time, the login page shows a QR code and 8 one-time backup codes (store them safely). Admins can't sign in with an emailed code alone, and can't turn the authenticator off. Owners and customers can turn it on under Account settings.
- **Actions that can't be undone** (delete listings, change roles, hand a listing to someone else, create admins, suspend accounts) ask the admin for a fresh authenticator code. If a phone is lost, use a backup code, then create new ones under Account & security.
- **`TRUST_PROXY=1` is required in production.** The API refuses to start without it, because otherwise every visitor looks like the same IP and rate limits protect nothing.
- **No test accounts on the live site.** Never run `seed-test-users.js` against the live database. Addresses ending in `@lokallens.test` are refused in production.
- **Create the first admin with a long password** (12+ characters): `scripts/create-admin.js`.
- After deploying this version everyone is signed out once (the sign-in storage changed).

## Search engines (SEO), after you go live
1. Set `NEXT_PUBLIC_SITE_URL` on Vercel to the **final public address** (for example `https://lokallens.in`, no slash at the end). Canonical links, the sitemap and share previews are built from it. Redeploy after changing it.
2. Pick one address (with or without `www`) and make the other forward to it in Vercel → Domains. Two live copies of the site split your ranking.
3. In **Google Search Console**: add the property, verify it (the HTML file in `public/` already does this for the current site, or set `GOOGLE_SITE_VERIFICATION` on Vercel), then submit `https://<your site>/sitemap.xml`.
4. In **Bing Webmaster Tools**: import the site from Search Console and submit the same sitemap.
5. The sitemap lists every business, every city page (`/<city>`) and every city + category page. If the site grows past 50,000 URLs, split it with `generateSitemaps` (see the Next.js docs).
6. Check a few pages with Google's **Rich Results Test** (a business page should show a local-business result) and **PageSpeed Insights**.
7. Photos on Cloudinary are served resized and in WebP/AVIF automatically. Keep new uploads on Cloudinary.
