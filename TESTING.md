# Lokal Lens: poori kahaani, shuru se (test karne ka aasaan tareeka)

Ye guide ek **kahaani** ki tarah hai. Platform bilkul khali hai, phir ek-ek karke log aate hain, aur aakhir mein bahut saare businesses ho jaate hain.
Har step mein likha hai: **kaun** hai, **kya karega**, aur **kya dikhna chahiye**.

---

## Kahan test karein? (local ya live)

| | Local (aapka computer) | Live (Vercel + Render) |
|---|---|---|
| Kab | **Pehle yahan**, poori kahaani | Local pass hone ke baad, **sirf chhota check** |
| Fayda | Kuch bhi galat ho jaye to database saaf kar do, koi nuksaan nahi | Asli users ki tarah, asli email, asli Google |
| Dhyan | Email aur Google asli chalte hain (mail apni hi Gmail par aayegi) | Yahan test ka data (fake business) asli users ko dikhega. Test ke baad **delete** kar do |

**Rule:** Poori kahaani (chapter 1 se 8) **local par**. Live par sirf **chapter 0, 2, 3, 4 ka ek-ek chhota** test (neeche likha hai).

### Local par "bilkul khali" platform kaise banayein
Abhi aapke local database mein 165 business hain. "Shuru se" dekhne ke liye ek naya khali database lo:

1. Backend ki `.env` mein `MONGODB_URI=mongodb://127.0.0.1:27017/business_directory` ko badal kar likho:
   `MONGODB_URI=mongodb://127.0.0.1:27017/lokal_lens_fresh`
2. Backend restart karo. Ab database khali hai (purana database bacha rehta hai, kuch delete nahi hota).
3. Wapas purane data par aane ke liye wahi line pehle jaisi kar do.

---

## Chapter 0: tayyari (5 minute)

1. Backend aur frontend dono chalao. Browser mein `http://localhost:3000` kholo.
2. **Teen alag browser rakho** (ya Chrome ke teen profile / incognito):
   - Browser A = **Admin**
   - Browser B = **Owner** (business wala)
   - Browser C = **Customer** (grahak)
3. Teen alag email chahiye (Gmail ke `+` trick se ek hi Gmail kaam karti hai):
   - admin: `aapki@gmail.com`
   - owner: `aapki+owner@gmail.com`
   - customer: `aapki+customer@gmail.com`
   (sab mail aapki ek hi inbox mein aayegi)

---

## Chapter 1: khali platform, Admin ka pehla din (Browser A)

**Admin banao** (terminal mein `Directory_backend-main\Directory_backend-main` folder ke andar):

PowerShell (Windows) mein:
```
$env:ADMIN_EMAIL="aapki@gmail.com"; $env:ADMIN_NAME="Aapka Naam"; $env:ADMIN_PASSWORD="lamba-password-yahan"; node scripts/create-admin.js
```
Git Bash mein:
```
ADMIN_EMAIL=aapki@gmail.com ADMIN_NAME="Aapka Naam" ADMIN_PASSWORD='lamba-password-yahan' node scripts/create-admin.js
```

| # | Admin kya karega | Kya dikhna chahiye |
|---|---|---|
| 1.1 | `/login` → "Use password instead" → email + password → Sign in | "Set up two-step verification" ka QR |
| 1.2 | Phone mein Google Authenticator se QR scan karo, 6 akshar ka code daalo | **8 backup codes** dikhein. Inhe kahin save karo, phir "I saved these" |
| 1.3 | Admin dashboard khulta hai | Overview; businesses 0, sab khali, "No businesses yet" jaise saaf message |
| 1.4 | **Categories** tab → "Add category" → naam likho "Healthcare" | Icon apne aap chun jata hai (stethoscope). Add dabao |
| 1.5 | Healthcare ke andar subcategory "Dentists" aur uski services (Dental check-up, Teeth cleaning, Root canal) | Dikhe |
| 1.6 | Ek aur category "Cafes & Restaurants" (subcategory "Cafes", services Coffee, Breakfast) | Dikhe |
| 1.7 | Browser A mein naya tab: `http://localhost:3000` (bina login wala customer view) | Home khali dikhe: koi business nahi, **par page toota nahi** (khali message), categories dikhein |

---

## Chapter 2: pehla Owner aata hai (Browser B)

| # | Owner kya karega | Kya dikhna chahiye |
|---|---|---|
| 2.1 | `/register` → "I own a business" → naam, email, **phone (zaroori)**, terms tick → Create account | Email aaye (naye design mein bada code) |
| 2.2 | Code daalo | Seedha owner dashboard; "Add your business" ka khali page |
| 2.3 | **Add a business** dabao. Step 1: naam "Smile Dental", category Healthcare › Dentists, description 80+ akshar | Kuch khali chhodo to red error aaye; Continue na ho |
| 2.4 | Step 2: address, city "Ghaziabad", state, PIN "201001" | PIN mein letters type na ho. "Find from address" se map par pin aaye |
| 2.5 | Step 3: services add karo (naam + price), opening hours | Closing time opening se pehle ho to error aaye |
| 2.6 | Step 4: phone, email, WhatsApp (alag number), photos | Galat email/phone par error |
| 2.7 | Step 5: preview dekho → **Submit for review** | "Thanks, we're reviewing". Dashboard par business "In review" |
| 2.8 | Owner ke browser mein `localhost:3000` par `Smile Dental` search karo | **Nahi dikhna chahiye** (abhi admin ne approve nahi kiya) |

---

## Chapter 3: Admin approve karta hai (Browser A)

| # | Admin kya karega | Kya dikhna chahiye |
|---|---|---|
| 3.1 | **Businesses** tab → "Smile Dental" par **Review** | Saari jaankari dikhe (naam, owner, photos, services, hours) |
| 3.2 | **Approve and publish** | Listing live ho jaye |
| 3.3 | Owner ke inbox mein mail | "Smile Dental is now live" |
| 3.4 | Browser C (customer, bina login) par `localhost:3000` | Home par Smile Dental dikhe |

---

## Chapter 4: Customer aata hai (Browser C)

**Bina login:**

| # | Customer kya karega | Kya dikhna chahiye |
|---|---|---|
| 4.1 | Search "dentist" | Smile Dental dikhe |
| 4.2 | `/ghaziabad` aur `/categories` kholo | City aur category pages, upar likha hua summary ("Lokal Lens lists 1 local business...") |
| 4.3 | Smile Dental kholo | Photos, address, services, hours, "Open until..." |
| 4.4 | **WhatsApp** dabao | Dialog → WhatsApp khule, message pehle se likha |
| 4.5 | Inquiry form bharo (naam, phone, message) → Send | "Your inquiry was sent". Phone mein letters na jayein |

**Phir account banake:**

| # | Customer kya karega | Kya dikhna chahiye |
|---|---|---|
| 4.6 | `/register` → "I'm looking for businesses" → **Continue with Google** (apni Gmail) | Popup, Gmail chuno, seedha `/account` |
| 4.7 | Smile Dental par ❤ (Save) | Account → Saved mein dikhe |
| 4.8 | Dobara inquiry bhejo (ab naam/phone **pehle se bhare** honge) | Bhejo. Account → My inquiries mein dikhe, status "Sent". Confirmation mail aaye |
| 4.9 | Review likho: 5 star + comment | Listing par dikhe, rating 5.0, "My reviews" mein bhi |

---

## Chapter 5: Owner ka din (Browser B)

| # | Owner kya karega | Kya dikhna chahiye |
|---|---|---|
| 5.1 | Dashboard khole | Views, **2 inquiries**, 1 review, rating 5.0 |
| 5.2 | **Inquiries** tab | Dono inquiry dikhein (ek bina login wali, ek customer wali) |
| 5.3 | Customer wali inquiry kholo → **Reply to customer** likho → Send | "Replied" badge. Status "Contacted" |
| 5.4 | Customer (Browser C) → My inquiries | Owner ka **reply dikhe** (neele box mein). Mail bhi aaye |
| 5.5 | Customer **Withdraw** dabaye | "Withdrawn". Owner ke paas "Withdrawn by customer", reply na ho |
| 5.6 | Owner → **Reviews** → review par Reply | Listing page par owner ka reply dikhe |
| 5.7 | Owner → **Offers** → naya offer (20% off, code, valid until) | `/offers` page aur listing par dikhe |
| 5.8 | Owner → **Analytics** | Views, WhatsApp clicks, inquiries ke **asli numbers** (jo customer ne kiya wahi) |
| 5.9 | Owner → Edit → **sirf description** badlo, save | Turant live, review mein nahi jata |
| 5.10 | Owner → Edit → **naam badlo**, save | "Our team will check again". Listing "In review", public se hat jaye |
| 5.11 | Admin ko dikhe: "Sent back for review: Changed: name" | Admin approve kare, phir wapas live |

---

## Chapter 6: gadbad hoti hai (spam, claim, report): Admin ka kaam

| # | Kya hota hai | Kya dikhna chahiye |
|---|---|---|
| 6.1 | Customer ek gande review par **Report** kare | Admin → Reports & claims → Reported reviews mein dikhe → Remove / Dismiss |
| 6.2 | Customer listing par **Report this listing** (reason "closed") | Admin → Reported listings → Suspend / Handled / Dismiss |
| 6.3 | Doosra owner usi listing par "Claim this listing" kare | Asli owner ko mail aur dashboard par "Someone asked to claim". Admin → Listing claims mein dikhe, owner ka "This isn't right" bhi |
| 6.4 | Admin claim **Reject** kare | Listing asli owner ke paas hi rahe |
| 6.5 | Admin listing **Suspend** kare | Public se hat jaye, owner ko mail. **Restore** se wapas |
| 6.6 | Admin kisi ko **admin banaye** ya listing **delete** kare | **Authenticator code zaroor maange** |
| 6.7 | Admin → **Activity** | Har kaam ki line: kisne, kya kiya |

---

## Chapter 7: ab bahut saare businesses (growth)

Ab dekhna hai ki jab 50-200 business hon to sab theek chalta hai.

1. **Demo data daalo:** backend folder se `npm run seed:demo` (kuch fake business aur accounts banata hai).
   Ya Admin → Businesses → **Bulk upload** mein "Download template" se sample CSV lo, usme 10-20 rows bharo aur upload karo.
2. Dekho:
   - Home, `/directory`: sab jaldi khulta hai (3 second se kam).
   - **Pagination / Load more** chalta hai (24 ke baad agla page).
   - **Filters** (rating, verified, area) aur **search** sahi results dete hain.
   - City page par ab likha aaye: "Lokal Lens lists 52 local businesses... Areas with the most listings include..."
   - Category page par "About healthcare in Ghaziabad" mein services aur sabse achhi rating.
   - Admin → Businesses: search, filter, **bulk select** (10 listing ek saath Suspend/Restore).
   - Admin → Export CSV chalta hai.
3. Ek owner ke paas 5 listing ho to Overview mein sab dikhein, "Profile setup" mein ek ek chuna ja sake.

---

## Chapter 8: phone par sab dekho (Browser ko chhota karo ya asli phone par)

Customer account, Owner dashboard, Admin: **neeche tab bar** dikhna chahiye. Kuch bhi **side mein khiskana** (horizontal scroll) nahi chahiye. Listing page par neeche "Call" bar aur amenities **2 column** mein.

---

## Live par kya karein (chhota check, 10 minute)

Local par sab pass hone ke baad, live (Vercel) par sirf ye:

1. Site kholo (`https://local-lens-olive.vercel.app`): home khula.
2. **Chapter 1.1-1.2**: admin login + authenticator.
3. **Chapter 2.1-2.2**: owner sign-up, mail aayi (live Render se).
4. **Chapter 4.6**: **Google login** live par chala.
5. Ek test business add karo → approve → dikha → **phir delete kar do** (taaki asli users ko test data na dikhe).
6. `/sitemap.xml` aur `/robots.txt` khulte hain.

Agar live par kuch alag behave kare to usually wajah ye hoti hai: Render ki `CLIENT_URL` galat, Vercel ki `NEXT_PUBLIC_API_URL` galat, ya redeploy nahi hua.

---

## Jo main pehle hi test kar chuka hoon (aapko dobara nahi karna)

Computer se automatically test hota hai: admin ke saare button, owner ka poora flow, forms ki validation, phone ka screen, security, emails ka design. Ye sab pass hai. Aap sirf **aankh se dekhna** aur **Google/Gmail wali cheezein** karo.
