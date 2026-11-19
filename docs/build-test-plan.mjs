// Builds TEST_PLAN.html (opens in any browser, prints to A4) from the test cases below.
//   node docs/build-test-plan.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Role -> which browser to use
const BROWSER = { Admin: "Browser A (Chrome)", Owner: "Browser B (Edge)", Customer: "Browser C (Incognito)", Public: "Browser C (Incognito)", Sab: "Koi bhi browser" };

// Modules in the order they are executed. Each test case: [title, role, priority, precondition, [steps], [expected]]
const MODULES = [
  { name: "A. Admin: platform ki shuruaat", intro: "Platform abhi khali hai. Pehle admin apna account aur categories taiyar karta hai.", cases: [
    ["Admin login aur authenticator lagana", "Admin", "High", "Setup ka step S4 (admin banana) ho chuka ho.", [
      "Browser A mein http://localhost:3000/login kholo.",
      "\"Use password instead\" dabao.",
      "Admin ka email aur password daalo, \"Sign in\" dabao.",
      "Phone mein Google Authenticator kholo, \"+\" dabake screen ka QR code scan karo.",
      "Authenticator mein jo 6 akshar ka code dikhe, wo box mein daalo, \"Verify\" dabao.",
      "8 backup codes dikhenge. Inhe copy ya download karke kahin safe save karo, phir \"I saved these\" dabao."],
      ["Login ke baad QR code dikhta hai.", "Galat code par error aata hai, sahi par aage badhta hai.", "8 backup codes dikhte hain.", "Aakhir mein /admin ka dashboard khulta hai."]],
    ["Admin dashboard khali platform par", "Admin", "High", "TC-01 pass ho.", [
      "Overview page dekho.",
      "Left menu ke har tab ko ek ek karke kholo: Businesses, People, Reports & claims, Reviews, Inquiries, Categories, Activity, Account & security."],
      ["Businesses ka count 0 hai.", "Har tab mein \"No ... yet\" jaisa saaf message hai.", "Koi blank page ya error screen nahi aati."]],
    ["Admin category banata hai (icon apne aap)", "Admin", "Medium", "TC-01 pass ho.", [
      "Categories tab kholo. 8 purani categories dikhni chahiye (Healthcare, Cafes & Restaurants...).",
      "\"Add a category\" ke box mein naam likho: Pet Care.",
      "Dekho ki icon apne aap chun liya gaya (paw wala). \"Add category\" dabao.",
      "Ab ek bekaar naam likho: Zzzz Qqq. Dekho ki \"We couldn't guess an icon\" likha aata hai aur \"Add category\" button band hai.",
      "\"Choose icon\" dabao, koi icon chuno, phir \"Add category\" dabao.",
      "Zzzz Qqq ke saamne dustbin icon dabao aur delete karo (authenticator code maangega)."],
      ["Pet Care ka icon khud chuna jata hai.", "Bekaar naam par icon khud chunna padta hai, bina chune add nahi hota.", "Delete par authenticator code maanga jata hai."]],
    ["Admin ke account ki suraksha", "Admin", "Medium", "TC-01 pass ho.", [
      "Left menu mein \"Account & security\" kholo.",
      "Two-step verification wale card ko dekho."],
      ["Status \"On\" hai.", "Likha hai \"Admin accounts must keep this on\".", "2FA band karne ka button nahi hai."]],
    ["Khali site customer ko kaisi dikhti hai", "Public", "High", "Database mein koi business nahi.", [
      "Browser C mein http://localhost:3000 kholo.",
      "Categories link dabao.",
      "/directory kholo.",
      "Search box mein kuch bhi likhke search karo."],
      ["Koi error ya toota hua page nahi.", "\"No results\" jaisa saaf message aur \"Clear filters\" button aata hai."]],
  ]},
  { name: "B. Owner: business add karta hai", intro: "Ab ek business owner aata hai aur apna business site par daalta hai.", cases: [
    ["Owner sign-up (email code se)", "Owner", "High", "Mail chalti ho (setup S3).", [
      "Browser B mein http://localhost:3000/register kholo.",
      "\"I own a business\" wala card chuno.",
      "Naam, email (aapki+owner@gmail.com), mobile number (10 digit) daalo.",
      "\"I agree to the Terms of Service and Privacy Policy\" par tick lagao.",
      "\"Create account & send code\" dabao.",
      "Email kholo, 6 akshar ka code copy karo, site par daalo."],
      ["Mail naye design mein aati hai: heading \"Your Lokal Lens code\", bada code, \"Expires in 10 minutes\".", "Sahi code ke baad seedha owner dashboard (/business-owner) khulta hai."]],
    ["Owner sign-up ki galtiyan pakadna", "Owner", "Medium", "Naya browser ya logout karke /register kholo.", [
      "Terms par tick lagaye bina \"Create account\" dabao.",
      "Mobile number khali chhodo (owner ke liye zaroori hai).",
      "Email mein sirf \"abc\" likho.",
      "Pehle bane email se dobara register karo.",
      "Login ka code jaanbujhkar 3 baar galat daalo."],
      ["Har galti par us field ke neeche saaf error aata hai.", "Wahi email dobara: \"An account with this email already exists\".", "Galat code par \"That code is not right\"."]],
    ["Business add: Step 1 (Basics)", "Owner", "High", "TC-06 pass ho. Dashboard khula ho.", [
      "\"Add a business\" dabao.",
      "Kuch bhi bhare bina \"Continue\" dabao.",
      "Naam likho: Smile Dental.",
      "Primary category mein \"Healthcare > Dentists\" chuno.",
      "Description mein 80 se zyada akshar likho.",
      "\"Continue\" dabao."],
      ["Khali form par red error aate hain aur aage nahi badhta.", "Sab bharne par Step 2 khulta hai."]],
    ["Business add: Step 2 (Location)", "Owner", "High", "TC-08 pass ho.", [
      "Building/street, area, city (Ghaziabad), state (Uttar Pradesh) bharo.",
      "PIN code mein pehle letters type karo (jaise ab12), phir 201001 likho.",
      "\"Find from address\" dabao (ya \"Use my live location\").",
      "Map par pin dekho. Zaroorat ho to pin ko khiskao.",
      "\"Continue\" dabao."],
      ["PIN code mein letters type nahi hote.", "5 ya 7 digit ka PIN refuse hota hai, sirf 6 digit chalta hai.", "Map par pin aata hai aur khiskaya ja sakta hai."]],
    ["Business add: Step 3 (Services aur hours)", "Owner", "High", "TC-09 pass ho.", [
      "\"Add a service\" dabao, naam likho (Teeth cleaning), price 500, \"Add service\" dabao.",
      "Ek aur service add karo (Root canal), bina price ke.",
      "Monday ka closing time opening se pehle rakho (jaise opens 9:00 AM, closes 8:00 AM).",
      "\"Continue\" dabao.",
      "Ab closing 6:00 PM karo aur opening mein koi bhi minute chuno (jaise 9:17).",
      "Sunday ko band (Closed) rehne do. \"Continue\" dabao."],
      ["Closing opening se pehle ho to error aata hai.", "Koi bhi minute chuna ja sakta hai, sirf 15 ya 30 ka nahi.", "Bina service ke aage nahi badhta."]],
    ["Business add: Step 4 (Contact aur photos)", "Owner", "High", "TC-10 pass ho.", [
      "Phone: 9876543210. Alternate phone mein wahi number likho.",
      "Email mein galat value (abc) likho, website mein javascript:alert(1) likho.",
      "Ab sahi karo: alternate phone alag number, email sahi, website https://example.com, WhatsApp alag number.",
      "Kuch photos upload karo (\"Choose photos\").",
      "\"Continue\" dabao."],
      ["Alternate phone wahi ho to \"This is the same as your main phone\".", "Galat email aur galat website par error.", "Phone mein letters type nahi hote.", "Photos upload hokar dikhti hain."]],
    ["Business add: Step 5 (Preview aur submit)", "Owner", "High", "TC-11 pass ho.", [
      "Preview page par saari jaankari dekho (naam, address, services, hours, contact).",
      "\"Submit for review\" dabao.",
      "\"Back to overview\" dabao."],
      ["Preview mein sab kuch sahi dikhta hai.", "\"Thanks, we're reviewing\" likha aata hai.", "Dashboard par business ke saamne \"In review\" likha hai."]],
    ["Business abhi public nahi hona chahiye", "Public", "High", "TC-12 pass ho (admin ne abhi approve nahi kiya).", [
      "Browser C mein http://localhost:3000 kholo.",
      "Search mein \"Smile Dental\" likhke dhundo.",
      "Browser address mein /directory/smile-dental kholo."],
      ["Search mein business nahi milta.", "Seedhe address par \"We couldn't find that page\" (404) aata hai."]],
  ]},
  { name: "C. Admin: business ko approve ya reject karta hai", intro: "Admin nayi listing ko check karke live karta hai.", cases: [
    ["Admin listing approve karta hai", "Admin", "High", "TC-12 pass ho.", [
      "Browser A mein \"Businesses\" tab kholo.",
      "\"Smile Dental\" ke saamne \"Review\" dabao.",
      "Panel mein saari jaankari dekho.",
      "\"Approve and publish\" dabao.",
      "Owner ka inbox kholo."],
      ["Panel mein naam, owner, photos, services, hours sab dikhte hain.", "Listing live ho jati hai.", "Owner ko mail aati hai: \"Smile Dental is now live\"."]],
    ["Approve ke baad customer ko business dikhta hai", "Public", "High", "TC-14 pass ho.", [
      "Browser C mein http://localhost:3000 kholo.",
      "\"Smile Dental\" search karo.",
      "Listing kholo."],
      ["Business search aur home par dikhta hai.", "Listing page par photos, address, services, hours, \"Open until...\" sab hai."]],
    ["Admin listing reject karta hai", "Admin", "Medium", "Owner ne ek doosra business (jaise \"Test Cafe\") add karke submit kiya ho.", [
      "Browser A mein Businesses tab mein \"Test Cafe\" par \"Review\" dabao.",
      "\"Reject\" dabao.",
      "Wajah likho: Phone number galat lag raha hai.",
      "Reject confirm karo.",
      "Owner ke dashboard mein dekho."],
      ["Owner ko wajah ke saath mail aati hai.", "Owner ke dashboard mein business par wajah dikhti hai.", "Business public nahi hota."]],
  ]},
  { name: "D. Customer: business dhundhta hai", intro: "Ab ek grahak site use karta hai. Pehle bina login, phir account banake.", cases: [
    ["Search, filters aur sort", "Public", "High", "Kam se kam 1 business live ho.", [
      "Search box mein \"dentist\" likho aur search karo.",
      "Left ke filters mein \"Open now\", \"Verified\" aur \"Rating 4+\" ek ek karke try karo.",
      "Sort ko Relevance se Rating par badlo.",
      "Grid aur List view badal ke dekho."],
      ["Results aur count har filter par badalte hain.", "Filter hataane par wapas aa jate hain."]],
    ["City aur category pages", "Public", "High", "Kam se kam 1 business live ho.", [
      "http://localhost:3000/ghaziabad kholo.",
      "Upar likha hua summary padho.",
      "City page se \"Healthcare in Ghaziabad\" par click karo.",
      "Neeche scroll karke \"About healthcare in Ghaziabad\" padho.",
      "Ab seedha /ghaziabad/healthcare likhke kholo."],
      ["Summary mein \"Lokal Lens lists N local businesses...\" likha hai.", "Category page par listings dikhti hain (0 results nahi).", "/ghaziabad/healthcare apne aap /nct-... wale asli address par chala jata hai."]],
    ["Listing page ki jaankari", "Public", "High", "Smile Dental live ho.", [
      "Smile Dental kholo.",
      "Photos, naam, rating, \"Open until\", address, services aur hours dekho.",
      "Photos par click karo, lightbox khulna chahiye.",
      "Share aur Save (heart) dabao."],
      ["Saari jaankari sahi dikhti hai.", "Lightbox khulta aur band hota hai.", "Share par link copy hota hai."]],
    ["Call, WhatsApp, Directions buttons", "Public", "Medium", "Smile Dental mein WhatsApp number daala ho.", [
      "\"Call\" dabao. Dialog aayega. \"Cancel\" dabao.",
      "\"WhatsApp\" dabao, dialog mein aage badho.",
      "\"Get directions\" dabao."],
      ["Har button pehle confirm dialog dikhata hai.", "WhatsApp khulta hai aur message pehle se likha hota hai: \"Hi, I found Smile Dental on Lokal Lens and would like to know more.\"", "Directions naye tab mein khulta hai."]],
    ["Bina login inquiry bhejna", "Public", "High", "Smile Dental live ho.", [
      "Listing ke \"Send an inquiry\" form mein naam likho.",
      "Phone mein letters type karke dekho (jaise abc98), phir 9811111111 likho.",
      "Message likho: Kya aap Sunday ko khule hain?",
      "\"Send inquiry\" dabao.",
      "Form ko galat phone (123) ke saath dobara bhejne ki koshish karo."],
      ["Phone mein letters nahi jate.", "\"Your inquiry was sent to Smile Dental.\" dikhta hai.", "Galat phone par error aata hai."]],
    ["Customer account Google se banana", "Customer", "High", "Google Client ID setup ho. Aapki Gmail Google Console ke Test users mein ho.", [
      "Browser C mein /register kholo.",
      "\"I'm looking for businesses\" wala card rehne do.",
      "\"Sign up with Google\" dabao.",
      "Popup mein apni Gmail chuno aur allow karo."],
      ["Popup khulta hai (origin_mismatch error nahi).", "Account ban jata hai aur seedha /account khulta hai.", "Wahi Gmail se dobara login par naya account nahi banta."]],
    ["Business save karna (heart)", "Customer", "Medium", "TC-22 pass ho.", [
      "Smile Dental kholo aur heart (Save) dabao.",
      "Account mein \"Saved\" tab kholo.",
      "Wahan \"Remove\" dabao."],
      ["Save karne par Saved tab mein dikhta hai.", "Remove par hat jata hai."]],
    ["Login ke saath inquiry (pehle se bhara form)", "Customer", "High", "TC-22 pass ho.", [
      "Smile Dental kholo.",
      "Inquiry form dekho.",
      "Message likhke \"Send inquiry\" dabao.",
      "Account > \"My inquiries\" kholo.",
      "Apni Gmail ka inbox kholo."],
      ["Naam, phone aur email pehle se bhare hote hain.", "My inquiries mein inquiry dikhti hai, status \"Sent\".", "Confirmation mail aati hai: \"Your inquiry was sent\" (details table, aapka message, \"Follow my inquiries\" button)."]],
    ["Review likhna", "Customer", "High", "TC-22 pass ho.", [
      "Smile Dental kholo, Reviews tak scroll karo.",
      "\"Write a review\" dabao.",
      "5 star chuno, comment likho, submit karo.",
      "Wahi karke dobara review likho (alag comment ke saath).",
      "Account > \"My reviews\" kholo."],
      ["Review listing par dikhta hai, rating 5.0 ho jati hai.", "Dobara review likhne par purana update hota hai, naya nahi banta.", "My reviews mein dikhta hai, \"Edit review\" aur \"Delete\" ke saath."]],
    ["Listing ko report karna", "Customer", "Medium", "TC-22 pass ho.", [
      "Smile Dental ke neeche \"Something wrong?\" wale hisse mein \"Report this listing\" dabao.",
      "Reason chuno: \"This business is closed or has moved\".",
      "Note mein likho: Dukaan band hai.",
      "\"Send report\" dabao."],
      ["\"Thanks for letting us know\" dikhta hai.", "Wahi listing dobara report karne par \"You already reported this listing\"."]],
  ]},
  { name: "E. Owner: roz ka kaam", intro: "Owner inquiry, review, offer aur analytics sambhalta hai.", cases: [
    ["Owner inquiries dekhta hai", "Owner", "High", "TC-21 aur TC-24 ki inquiry aa chuki ho.", [
      "Browser B mein dashboard kholo (Overview).",
      "\"Inquiries\" tab kholo."],
      ["Overview mein inquiries ka count dikhta hai.", "Dono inquiry dikhti hain (ek bina login wali, ek customer wali).", "Owner ko mail aayi thi: \"New inquiry for Smile Dental\" (details table ke saath)."]],
    ["Owner inquiry ka jawab deta hai", "Owner", "High", "TC-27 pass ho.", [
      "Customer wali inquiry par \"Notes\" dabao, panel khulega.",
      "\"Reply to customer\" box mein likho: Ji haan, Sunday ko 10 se 2 khule hain.",
      "\"Send reply\" dabao.",
      "Status \"Contacted\" par dekho."],
      ["\"Replied\" badge dikhta hai.", "Status Contacted ho jata hai.", "Customer ko mail jati hai: \"Smile Dental replied\" (reply quote mein)."]],
    ["Customer jawab dekhta aur inquiry wapas leta hai", "Customer", "High", "TC-28 pass ho.", [
      "Browser C (Customer) mein Account > \"My inquiries\" kholo.",
      "Owner ka jawab dekho.",
      "\"Withdraw\" dabao aur confirm karo.",
      "Browser B (Owner) mein wahi inquiry kholo."],
      ["Jawab \"Reply from Smile Dental\" ke neele box mein dikhta hai.", "Withdraw ke baad \"Withdrawn\" dikhta hai.", "Owner ke paas \"Withdrawn by customer\" likha aata hai aur reply ka box nahi hota."]],
    ["Owner review ka jawab deta hai", "Owner", "Medium", "TC-25 pass ho.", [
      "Browser B mein \"Reviews\" tab kholo.",
      "Customer ke review ke neeche \"Reply\" dabao.",
      "Jawab likho aur \"Post reply\" dabao.",
      "Public listing page par review dekho."],
      ["Jawab review ke neeche dikhta hai.", "Public page par bhi owner ka jawab dikhta hai."]],
    ["Owner offer banata hai", "Owner", "Medium", "Smile Dental live ho.", [
      "\"Offers\" tab kholo, \"Add an offer\" dabao.",
      "Title: 20% off first visit. Valid until: aage ki koi tareekh. Coupon code: FIRST20.",
      "Save karo.",
      "Browser C mein /offers kholo."],
      ["Offer owner ke dashboard mein dikhta hai.", "/offers page aur listing par bhi dikhta hai."]],
    ["Owner analytics dekhta hai", "Owner", "Medium", "Pehle ki testing mein listing par kuch clicks hue hon.", [
      "\"Analytics\" tab kholo.",
      "7, 30 aur 90 din ke option badal ke dekho."],
      ["Views, calls, WhatsApp, directions aur inquiries ke asli numbers aate hain.", "Koi error ya blank graph nahi."]],
    ["Description badalna (review nahi lagta)", "Owner", "High", "Smile Dental live ho.", [
      "Dashboard par Smile Dental ke \"Edit\" dabao.",
      "Step 1 mein sirf description badlo.",
      "Sab steps \"Continue\" se guzaro aur aakhir mein save karo."],
      ["Save ho jata hai aur listing turant live rehti hai, \"In review\" nahi hoti."]],
    ["Naam badalna (dobara review lagta hai)", "Owner", "High", "TC-33 pass ho.", [
      "Smile Dental ke \"Edit\" dabao.",
      "Business name ko badal ke \"Smile Dental Studio\" karo.",
      "Sab steps guzaro aur save karo.",
      "Browser C mein listing kholne ki koshish karo."],
      ["Save ke baad likha aata hai: \"our team will check the listing again\".", "Listing \"In review\" ho jati hai.", "Customer ko listing ab nahi dikhti."]],
    ["Admin dobara approve karta hai", "Admin", "High", "TC-34 pass ho.", [
      "Browser A mein Businesses tab kholo.",
      "Smile Dental Studio par \"Review\" dabao.",
      "Dekho: \"Sent back for review: Changed: name\" likha hai.",
      "\"Approve and publish\" dabao."],
      ["Admin ko saaf dikhta hai ki kya badla (naam aur purana naam).", "Approve ke baad listing wapas live ho jati hai."]],
    ["Pause aur Resume", "Owner", "Medium", "Listing live ho.", [
      "Dashboard par listing ke \"Pause\" dabao aur \"Pause listing\" se confirm karo.",
      "Browser C mein listing kholo.",
      "Browser B mein \"Resume\" dabao aur \"Go live\" se confirm karo."],
      ["Pause par listing public se hat jati hai (404).", "Resume par wapas dikhti hai."]],
    ["Owner ka account (naam aur password)", "Owner", "Medium", "Owner login ho.", [
      "\"Account settings\" kholo.",
      "Full name mein digits wala naam likho (jaise Raj2 Kumar) aur \"Save profile\" dabao.",
      "Password badlo: pehle galat current password daalo, phir sahi daalo.",
      "Naye password se logout karke login karo."],
      ["Naam se digits hat jate hain.", "Galat current password par error aata hai.", "Sahi par password badalta hai aur purana band ho jata hai."]],
  ]},
  { name: "F. Admin: gadbad sambhalna", intro: "Spam, galat claim aur report ko admin sambhalta hai.", cases: [
    ["Gande review ki report aur Admin ka action", "Admin", "High", "Customer ne kisi review par \"Report\" dabaya ho (reason chuno aur bhejo).", [
      "Browser A mein \"Reports & claims\" kholo.",
      "\"Reported reviews\" par report dekho.",
      "\"Dismiss\" dabao (review rehta hai) ya \"Remove review\" dabao (review hat jata hai)."],
      ["Report review ke saath dikhti hai.", "Remove par review hat jata hai aur rating dobara hisaab hoti hai."]],
    ["Listing report ka Admin action", "Admin", "High", "TC-26 pass ho.", [
      "\"Reports & claims\" mein \"Reported listings\" tab kholo.",
      "Report ke neeche reason, reporter aur owner dekho.",
      "\"Suspend listing\" dabao aur confirm karo.",
      "Browser C mein listing kholo."],
      ["Report dikhti hai.", "Suspend par listing public se hat jati hai.", "Report \"Handled\" ban jati hai."]],
    ["Doosra owner listing claim karta hai", "Owner", "High", "Ek doosra owner account (aapki+owner2@gmail.com) bana ho.", [
      "Naye browser mein owner2 se login karo.",
      "Smile Dental (jo owner1 ka hai) kholo aur \"Claim this listing\" dabao.",
      "Phone aur \"Why is it yours?\" bharo, \"Send claim\" dabao.",
      "Asli owner (Browser B) ka dashboard dekho."],
      ["Claim ka form khulta hai.", "Asli owner ke dashboard par \"Someone asked to claim your listing\" dikhta hai.", "Asli owner ko mail jati hai. Listing apne aap nahi badalti."]],
    ["Asli owner claim par aitraaz karta hai", "Owner", "Medium", "TC-40 pass ho.", [
      "Browser B mein pile card ke \"This isn't right\" dabao.",
      "Kuch likho (jaise: Main isse nahi jaanta).",
      "\"Send to our team\" dabao."],
      ["Likha aata hai \"You told us it's not right\".", "Admin ko ye note dikhta hai."]],
    ["Admin claim reject karta hai", "Admin", "High", "TC-41 pass ho.", [
      "Browser A mein Reports & claims > \"Listing claims\" kholo.",
      "Claim dekho: \"Current owner was told\" badge aur owner ka aitraaz.",
      "\"Reject\" dabao aur confirm karo."],
      ["Claim \"Rejected\" ho jata hai.", "Listing asli owner ke paas hi rehti hai.", "Claimant ko mail jati hai."]],
    ["Admin listing suspend aur restore karta hai", "Admin", "High", "Listing live ho.", [
      "Businesses tab mein listing par \"Manage\" dabao.",
      "\"Suspend listing\" dabao aur confirm karo.",
      "Browser C mein listing kholo.",
      "Wapas \"Restore listing\" dabao."],
      ["Suspend par listing public se hat jati hai, owner ko mail jati hai.", "Restore par wapas live."]],
    ["Listing delete karne par authenticator maangna", "Admin", "High", "Ek test listing ho.", [
      "Manage panel mein listing ka naam type karne wale box mein poora naam likho.",
      "\"Delete\" dabao.",
      "Authenticator ka 6 akshar ka code daalo aur confirm karo."],
      ["Naam type kiye bina Delete button band rehta hai.", "Bina authenticator code ke delete nahi hota.", "Sahi code ke baad listing hat jati hai."]],
    ["Kisi user ko suspend karna aur role badalna", "Admin", "High", "Ek customer account ho.", [
      "People tab mein kisi customer par click karo.",
      "\"Suspend account\" dabao, authenticator code daalo.",
      "Us customer se login karke dekho.",
      "\"Reactivate account\" dabao.",
      "Dropdown se role \"Admin\" chuno (confirm mat karo)."],
      ["Suspend ke baad wo login nahi kar paata.", "Role admin karne par authenticator code maanga jata hai.", "Bina code ke role nahi badalta."]],
    ["Activity log", "Admin", "Low", "Upar ke kaam ho chuke hon.", [
      "\"Activity\" tab kholo."],
      ["Har admin action ki ek line hai: kisne, kya kiya, kab (jaise \"Approved listing\", \"Suspended listing\")."]],
  ]},
  { name: "G: bahut saare businesses", intro: "Ab dekhna hai ki jab 50 se 200 business hon to sab theek chalta hai.", cases: [
    ["Bahut saara data daalna", "Admin", "High", "Admin login ho.", [
      "Terminal mein backend folder ke andar chalao: npm run seed:demo",
      "Ya Businesses tab mein \"Bulk upload\" kholo, \"Download template\" se CSV lo, 10 se 20 rows bharo aur upload karo."],
      ["Naye businesses ban jate hain.", "Galat rows ho to unki alag list dikhti hai (kaun si row, kya galti)."]],
    ["Site tez chalti hai aur pagination", "Public", "Medium", "TC-47 pass ho.", [
      "Home aur /directory kholo, dhyan se dekho kitni der lagi.",
      "/directory par neeche \"Load more\" dabao.",
      "Filters (Verified, Rating, Area) aur search try karo."],
      ["Page 3 second se kam mein khulte hain.", "24 businesses ke baad agla page aata hai.", "Filter aur search sahi results dete hain."]],
    ["City aur category summary bhar jana", "Public", "Low", "TC-47 pass ho.", [
      "/ghaziabad aur uski category page kholo."],
      ["Summary mein ab areas ke naam (\"Areas with the most listings include ...\") aur common services aate hain."]],
    ["Admin bulk actions aur export", "Admin", "Medium", "TC-47 pass ho.", [
      "Businesses tab mein 5 listings ke checkbox tick karo.",
      "\"Suspend\" dabao (code maangega), phir \"Restore\".",
      "\"Export CSV\" dabao aur file Excel mein kholo."],
      ["\"5 selected\" likha aata hai aur sab ek saath badalte hain.", "CSV download hota hai aur Excel mein sahi khulta hai."]],
  ]},
  { name: "H: login ke saare tareeke", intro: "Ek hi cheez ke alag alag raaste.", cases: [
    ["Password se login aur lock", "Customer", "High", "Ek customer account ho jisme password laga ho.", [
      "/login par \"Use password instead\" dabao.",
      "Galat password se login karo.",
      "Sahi password se login karo.",
      "Galat password 8 baar daalo."],
      ["Galat par \"Invalid email or password\".", "Sahi par andar ja paate ho.", "8 baar ke baad \"Too many wrong attempts\" aata hai aur kuch der login band rehta hai."]],
    ["Password bhool gaye (Forgot password)", "Customer", "High", "Mail chalti ho.", [
      "/login par \"Use password instead\", phir \"Forgot password?\" dabao.",
      "Email daalo aur bhejo.",
      "Email kholo aur \"Choose a new password\" button dabao.",
      "Naya password do aur save karo.",
      "Purane password se login karke dekho."],
      ["Mail mein button aur link hai.", "Naye password se login hota hai.", "Purana password nahi chalta."]],
    ["Email code se login (bina password)", "Customer", "Medium", "Ek purana account ho.", [
      "/login par email daalo aur \"Send code\" dabao.",
      "Mail se code lo aur daalo."],
      ["Code se login ho jata hai.", "Code 10 minute baad expire ho jata hai."]],
    ["Google login ke alag haal", "Customer", "High", "Google setup ho.", [
      "Nayi Gmail se Login page par \"Sign in with Google\" dabao.",
      "Naya account hone par \"customer ya owner?\" ka sawaal aayega, \"customer\" chuno.",
      "Logout karo, wahi Gmail se dobara Google login karo.",
      "Admin ki email wali Gmail se Google login try karo (agar wahi Gmail hai)."],
      ["Pehli baar role poochhta hai.", "Dobara login par seedha andar jata hai, naya account nahi banta.", "Admin ke liye error: \"Admins sign in with a password and an authenticator code\"."]],
    ["Logout aur browser Back", "Customer", "Medium", "Customer login ho.", [
      "Account ke upar se \"Log out\" dabao.",
      "Browser ka Back button dabao.",
      "/account seedha kholne ki koshish karo."],
      ["Logout par login page aata hai.", "Back dabane par dashboard ka data nahi dikhta.", "/account login par bhej deta hai."]],
    ["Do-step verification (customer ke liye optional)", "Customer", "Medium", "Customer login ho.", [
      "Account > \"Two-step verification\" > \"Turn on\".",
      "QR scan karo aur code daalo, backup codes save karo.",
      "Logout karke login karo (code maangega).",
      "Account mein \"Turn off\" dabao aur code daalo."],
      ["Login par authenticator code maanga jata hai.", "Turn off par bhi code maanga jata hai."]],
  ]},
  { name: "I: emails", intro: "Har email ka design aur sahi jagah par pahunchna.", cases: [
    ["Email ke design ka preview", "Sab", "Medium", "Backend folder ka terminal.", [
      "Chalao: node scripts/preview-emails.js",
      "File kholo: Directory_backend-main/Directory_backend-main/tmp/email-previews/index.html",
      "Har sample ko ek ek karke kholo (code, reset, claim, inquiry, reply, review, approve, reject)."],
      ["Sab emails ek jaisi dikhti hain: upar logo, safed card, heading, ek button, neeche chhota footer.", "Code wale emails mein code bada dabbe mein hai."]],
    ["Asli inbox mein emails", "Sab", "High", "Upar ke test cases ho chuke hon.", [
      "Gmail mein dekho: sign-up code, inquiry, reply, listing approve ki mail aayi ya nahi.",
      "Spam folder bhi dekho.",
      "Ek mail phone ke Gmail app mein kholo."],
      ["Saari mails Inbox mein aati hain, Spam mein nahi.", "Phone par design tuta nahi aur button dabta hai."]],
  ]},
  { name: "J: suraksha", intro: "Jo nahi hona chahiye wo na ho.", cases: [
    ["Ek role doosre ke page mein nahi ja sakta", "Customer", "High", "Customer login ho.", [
      "Customer ke login ke saath http://localhost:3000/admin kholo.",
      "Phir http://localhost:3000/business-owner kholo."],
      ["Dono address par customer apne /account par laut jata hai.", "Admin ya owner ka data nahi dikhta."]],
    ["Doosre owner ki listing nahi chhedi ja sakti", "Owner", "High", "Do owner accounts aur unki alag listings hon.", [
      "Owner1 ki listing ka edit address note karo (/add-business?edit=...).",
      "Owner2 ke login ke saath wahi address kholo."],
      ["Edit nahi khulta, \"not found\" jaisa message aata hai."]],
    ["Galat likha hua code site ko nahi tod sakta", "Sab", "High", "Koi bhi login.", [
      "Inquiry ke message mein likho: <script>alert(1)</script>",
      "Business ke description mein bhi yahi likho aur save karo.",
      "Listing page kholo."],
      ["Wo text jaisa hai waisa dikhta hai.", "Koi popup (alert) nahi aata."]],
    ["Galat address par saaf 404", "Public", "Low", "Koi bhi.", [
      "http://localhost:3000/yeh-page-nahi-hai kholo.",
      "http://localhost:3000/directory/koi-business-nahi kholo."],
      ["\"We couldn't find that page\" aata hai, blank page ya server error nahi."]],
  ]},
  { name: "K: phone par", intro: "Browser ko chhota karo (390 px) ya asli phone par kholo.", cases: [
    ["Customer ke pages phone par", "Customer", "High", "Browser ko 390 px chauda karo (F12 > phone icon).", [
      "Home, search aur Smile Dental ki listing kholo.",
      "/account kholo aur neeche ke tab bar se sab tab kholo."],
      ["Side mein khiskana (horizontal scroll) nahi hai.", "Listing par neeche \"Call\" bar hai.", "Amenities 2 column mein hain.", "/account mein neeche tab bar hai."]],
    ["Owner dashboard phone par", "Owner", "High", "Browser chhota ho.", [
      "Owner dashboard kholo, neeche ke 6 tab ek ek karke kholo.",
      "Reviews mein ek reply bhejo.",
      "Listing ko Pause aur Resume karo."],
      ["Har tab screen mein fit aata hai.", "Reply aur Pause/Resume chalte hain."]],
    ["Admin phone par", "Admin", "Medium", "Browser chhota ho.", [
      "Admin dashboard kholo, neeche ki bar ko side mein khiskake sab tab kholo.",
      "Businesses mein ek listing par \"Manage\" dabao, Suspend aur Restore karo."],
      ["Sab tab kaam karte hain, side mein khiskana nahi.", "Manage panel poora dikhta hai."]],
  ]},
  { name: "L: live site (Vercel + Render) par chhota check", intro: "Local par sab pass hone ke baad ye 10 minute ka check karo.", cases: [
    ["Live site khulti hai", "Sab", "High", "Vercel aur Render redeploy ho chuke hon.", [
      "https://local-lens-olive.vercel.app kholo (pehli baar Render 30 se 50 second le sakta hai).",
      "Home, /directory aur ek listing kholo."],
      ["Home khulta hai aur images aati hain.", "Console mein error nahi (F12 > Console)."]],
    ["Live par admin, owner aur mail", "Admin", "High", "Live par admin banaya ho (create-admin).", [
      "Admin login karke authenticator lagao.",
      "Naya owner sign-up karo aur check karo ki mail aati hai."],
      ["Admin login chalta hai.", "Sign-up ka code live server se email par aata hai."]],
    ["Live par Google login", "Customer", "High", "Google Console mein live URL jodha ho.", [
      "Live site par \"Sign in with Google\" dabao."],
      ["Popup khulta hai aur login hota hai. \"origin_mismatch\" aaye to Console mein live URL check karo."]],
    ["Live par test data saaf karo", "Admin", "High", "Live par ek test business bana ho.", [
      "Ek test business add karo, approve karo, live par dekho.",
      "Phir Admin se us business ko delete karo (authenticator code ke saath)."],
      ["Test business live site par nahi bachna chahiye."]],
    ["Sitemap aur robots", "Public", "Low", "Live site.", [
      "https://local-lens-olive.vercel.app/sitemap.xml kholo.",
      "https://local-lens-olive.vercel.app/robots.txt kholo."],
      ["Dono khulte hain. Sitemap mein listings aur city/category pages hain."]],
  ]},
];

for (const m of MODULES) m.cases = m.cases.map(([title, role, prio, pre, steps, expect]) => ({ title, role, prio, pre, steps, expect }));

// Number the cases in order
let n = 0;
for (const m of MODULES) for (const c of m.cases) { n += 1; c.id = `TC-${String(n).padStart(2, "0")}`; }
const total = n;

const SETUP = [
  ["S1", "Backend chalao", "VS Code mein Terminal > New Terminal kholo.", "cd Directory_backend-main\\Directory_backend-main\nnpm run dev", "Likha aaye ki server port 5000 par chal raha hai. Terminal band mat karna."],
  ["S2", "Frontend chalao", "Doosra naya terminal kholo (main project folder mein).", "npm run dev", "Likha aaye \"Ready\" aur localhost:3000. Terminal band mat karna."],
  ["S3", "Mail check karo", "Teesra naya terminal kholo.", "cd Directory_backend-main\\Directory_backend-main\nnode scripts/send-test-email.js aapki@gmail.com", "Terminal mein \"Sent\" likha aaye, aur Gmail mein test mail aaye."],
  ["S4", "Admin banao", "Usi teesre terminal mein, ek hi line mein (naam, email, password apne daalo, password 12 akshar se bada).", "$env:ADMIN_EMAIL=\"aapki@gmail.com\"; $env:ADMIN_NAME=\"Aapka Naam\"; $env:ADMIN_PASSWORD=\"koi-lamba-password-123\"; node scripts/create-admin.js", "Bina error ke khatam ho. Ab is email aur password se admin login hoga."],
  ["S5", "Teen browser aur teen email", "Browser A = Chrome (Admin). Browser B = Edge ya Chrome ka doosra profile (Owner). Browser C = Incognito window (Customer). Email: aapki@gmail.com (admin), aapki+owner@gmail.com (owner), aapki+customer@gmail.com (customer). Teeno ki mail ek hi inbox mein aati hai.", "", "Teeno browser khule hon aur teeno mein http://localhost:3000 khula ho."],
];

const ACCOUNTS = [
  ["Admin", "aapki@gmail.com", "Jo password S4 mein rakha", "Authenticator app + backup codes"],
  ["Owner 1", "aapki+owner@gmail.com", "Email code se (ya password set karo)", "Sign-up TC-06 mein banega"],
  ["Owner 2", "aapki+owner2@gmail.com", "Email code se", "Claim ke test (TC-40) ke liye"],
  ["Customer", "Apni Gmail (Google se)", "Google login", "TC-22 mein banega"],
];

const caseHtml = (c) => `
<article class="tc" id="${c.id}" data-id="${c.id}">
  <header>
    <span class="tcid">${c.id}</span>
    <h3>${esc(c.title)}</h3>
    <span class="chip role ${c.role}">${esc(c.role === "Public" ? "Koi bhi (bina login)" : c.role)}</span>
    <span class="chip prio ${c.prio}">${esc(c.prio)}</span>
  </header>
  <div class="meta"><b>Kaunsa browser:</b> ${esc(BROWSER[c.role])} &nbsp;&nbsp; <b>Pehle se chahiye:</b> ${esc(c.pre)}</div>
  <div class="cols">
    <div>
      <h4>Kya karna hai (steps)</h4>
      <ol>${c.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
    </div>
    <div>
      <h4>Kya dikhna chahiye (expected result)</h4>
      <ul class="exp">${c.expect.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
    </div>
  </div>
  <footer>
    <label class="rb ok"><input type="radio" name="r-${c.id}" value="pass"> Pass</label>
    <label class="rb bad"><input type="radio" name="r-${c.id}" value="fail"> Fail</label>
    <label class="rb skip"><input type="radio" name="r-${c.id}" value="skip"> Abhi nahi kiya</label>
    <input class="note" type="text" data-note="${c.id}" placeholder="Remarks: jo dikha wo yahan likho (fail par zaroor)">
  </footer>
</article>`;

const toc = MODULES.map((m) => {
  const ids = m.cases.map((c) => c.id);
  return `<tr><td>${esc(m.name)}</td><td>${ids[0]} se ${ids.at(-1)}</td><td>${m.cases.length}</td></tr>`;
}).join("");

const modulesHtml = MODULES.map((m) => `
<section class="module">
  <h2>${esc(m.name)}</h2>
  <p class="intro">${esc(m.intro)}</p>
  ${m.cases.map(caseHtml).join("")}
</section>`).join("");

const setupHtml = SETUP.map((s) => `
<tr>
  <td class="sid">${s[0]}</td>
  <td><b>${esc(s[1])}</b><br>${esc(s[2])}${s[3] ? `<pre>${esc(s[3])}</pre>` : ""}</td>
  <td>${esc(s[4])}</td>
  <td class="chk"><input type="checkbox" data-setup="${s[0]}" aria-label="${s[0]} ho gaya"></td>
</tr>`).join("");

const html = `<!doctype html>
<html lang="hi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lokal Lens: Test Plan aur Test Cases</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root { --ink:#101828; --body:#344054; --muted:#667085; --line:#d0d5dd; --soft:#f2f4f7; --brand:#002fa7; --ok:#067647; --okbg:#ecfdf3; --bad:#b42318; --badbg:#fef3f2; }
  * { box-sizing:border-box; }
  html { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  body { margin:0; font-family:"Poppins","Segoe UI",system-ui,sans-serif; font-size:16px; line-height:1.7; color:var(--body); background:#fff; }
  .page { max-width:980px; margin:0 auto; padding:0 28px 80px; }
  /* cover */
  .cover { padding:70px 0 40px; border-bottom:3px solid var(--brand); margin-bottom:34px; }
  .cover .tag { color:var(--brand); font-weight:600; letter-spacing:1.5px; text-transform:uppercase; font-size:13px; }
  .cover h1 { font-size:42px; line-height:1.2; margin:10px 0 6px; color:var(--ink); font-weight:700; letter-spacing:-.5px; }
  .cover p { font-size:18px; color:var(--muted); margin:0; }
  .info { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-top:28px; }
  .info div { background:var(--soft); border-radius:12px; padding:12px 14px; font-size:14px; }
  .info b { display:block; color:var(--muted); font-weight:500; font-size:12px; text-transform:uppercase; letter-spacing:.6px; }
  .info input { border:0; border-bottom:1px solid var(--line); background:transparent; font:inherit; width:100%; padding:2px 0; color:var(--ink); }
  h2 { font-size:26px; line-height:1.3; color:var(--ink); margin:44px 0 6px; font-weight:600; letter-spacing:-.3px; }
  h2 .no { color:var(--brand); }
  h3 { margin:0; font-size:18px; color:var(--ink); font-weight:600; line-height:1.4; }
  h4 { margin:0 0 6px; font-size:13px; letter-spacing:.7px; text-transform:uppercase; color:var(--muted); font-weight:600; }
  p.intro { margin:0 0 14px; font-size:16px; }
  table { border-collapse:collapse; width:100%; font-size:15px; }
  th { text-align:left; background:var(--ink); color:#fff; font-weight:500; padding:10px 12px; font-size:13px; letter-spacing:.4px; }
  td { padding:10px 12px; border-bottom:1px solid var(--line); vertical-align:top; }
  td.sid { font-weight:700; color:var(--brand); white-space:nowrap; }
  td.chk { text-align:center; } td.chk input { width:22px; height:22px; accent-color:var(--ok); }
  pre { background:#101828; color:#e4e7ec; border-radius:10px; padding:12px 14px; font:13.5px/1.6 Consolas,Menlo,monospace; white-space:pre-wrap; word-break:break-all; margin:8px 0 0; }
  .box { background:var(--soft); border-radius:14px; padding:16px 20px; margin:12px 0; }
  .box ul { margin:6px 0 0 20px; padding:0; } .box li { margin:3px 0; }
  .howto ol { margin:6px 0 0 22px; padding:0; } .howto li { margin:5px 0; }
  /* test case */
  .tc { border:1px solid var(--line); border-radius:16px; margin:18px 0; overflow:hidden; break-inside:avoid; }
  .tc header { display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding:14px 18px; background:#f9fafb; border-bottom:1px solid var(--line); }
  .tc header h3 { flex:1; min-width:220px; }
  .tcid { background:var(--brand); color:#fff; font-weight:600; font-size:13px; padding:3px 11px; border-radius:99px; letter-spacing:.4px; }
  .chip { font-size:12px; font-weight:600; padding:2px 10px; border-radius:99px; }
  .role.Admin { background:#ffedd5; color:#9a3412; } .role.Owner { background:#dbeafe; color:#1e40af; } .role.Customer { background:#ccfbf1; color:#115e59; } .role.Public { background:#e0e7ff; color:#3730a3; } .role.Sab { background:#e5e7eb; color:#374151; }
  .prio.High { background:#fee4e2; color:#b42318; } .prio.Medium { background:#fef0c7; color:#93370d; } .prio.Low { background:#e4e7ec; color:#475467; }
  .meta { padding:10px 18px 0; font-size:14px; color:var(--muted); }
  .meta b { color:var(--body); font-weight:600; }
  .cols { display:grid; grid-template-columns:1.25fr 1fr; gap:22px; padding:14px 18px 6px; }
  .cols ol { margin:0 0 0 20px; padding:0; } .cols ol li { margin:6px 0; padding-left:4px; }
  .exp { list-style:none; margin:0; padding:12px 14px; background:var(--okbg); border-radius:12px; }
  .exp li { margin:5px 0; padding-left:22px; position:relative; color:#054f31; }
  .exp li::before { content:"\\2713"; position:absolute; left:0; font-weight:700; color:var(--ok); }
  .tc footer { display:flex; align-items:center; gap:14px; flex-wrap:wrap; padding:12px 18px 16px; }
  .rb { display:inline-flex; align-items:center; gap:7px; border:1.5px solid var(--line); border-radius:99px; padding:5px 16px; cursor:pointer; font-weight:500; font-size:15px; background:#fff; }
  .rb input { width:18px; height:18px; margin:0; accent-color:var(--brand); }
  .rb.ok:has(input:checked) { background:var(--okbg); border-color:var(--ok); color:var(--ok); font-weight:600; }
  .rb.bad:has(input:checked) { background:var(--badbg); border-color:var(--bad); color:var(--bad); font-weight:600; }
  .rb.skip:has(input:checked) { background:var(--soft); border-color:var(--muted); }
  .note { flex:1; min-width:240px; font:inherit; font-size:14px; padding:8px 12px; border:1px solid var(--line); border-radius:10px; }
  /* sticky progress (screen only) */
  .sticky { position:sticky; top:0; z-index:5; background:rgba(255,255,255,.96); backdrop-filter:blur(6px); border-bottom:1px solid var(--line); padding:10px 0; }
  .sticky .in { max-width:980px; margin:0 auto; padding:0 28px; display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
  .track { flex:1; min-width:180px; height:10px; background:var(--soft); border-radius:99px; overflow:hidden; display:flex; }
  .track i { display:block; height:100%; } .track .p { background:var(--ok); } .track .f { background:var(--bad); }
  .sticky .txt { font-size:14px; color:var(--muted); font-weight:500; }
  .sticky button { font:inherit; font-size:14px; font-weight:500; border:1px solid var(--line); background:#fff; border-radius:10px; padding:6px 14px; cursor:pointer; }
  .sticky button.pri { background:var(--brand); color:#fff; border-color:var(--brand); }
  .toast { position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:var(--ink); color:#fff; padding:10px 18px; border-radius:12px; font-size:14px; opacity:0; transition:opacity .2s; pointer-events:none; }
  .toast.show { opacity:1; }
  .sign { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-top:20px; }
  .sign div { border-top:1.5px solid var(--ink); padding-top:6px; font-size:14px; color:var(--muted); }
  @media (max-width:760px) { .cols { grid-template-columns:1fr; } .info { grid-template-columns:1fr 1fr; } .cover h1 { font-size:32px; } }
  @media print {
    @page { size:A4; margin:14mm 12mm; }
    body { font-size:11pt; line-height:1.55; }
    .page { max-width:none; padding:0; }
    .sticky, .toast { display:none !important; }
    .cover { padding:20mm 0 8mm; margin-bottom:8mm; }
    .cover h1 { font-size:30pt; }
    h2 { font-size:17pt; break-after:avoid; margin-top:10mm; }
    .module { break-before:auto; }
    .tc { margin:5mm 0; }
    .note { border:0; border-bottom:1px solid var(--line); border-radius:0; }
  }
</style>
</head>
<body>
<div class="sticky"><div class="in">
  <strong style="color:var(--ink)">Lokal Lens: test</strong>
  <div class="track"><i class="p" id="bp"></i><i class="f" id="bf"></i></div>
  <span class="txt" id="stats"></span>
  <button class="pri" id="copyFail">Fail ki list copy karo</button>
  <button id="print">PDF / Print</button>
  <button id="reset">Sab saaf karo</button>
</div></div>

<div class="page">
<section class="cover">
  <div class="tag">Test plan aur test cases</div>
  <h1>Lokal Lens<br>Business Directory</h1>
  <p>Customer, Owner aur Admin: poori site ki testing ka document</p>
  <div class="info">
    <div><b>Version</b>1.0</div>
    <div><b>Tareekh</b>19 November 2026</div>
    <div><b>Tester ka naam</b><input type="text" data-field="tester" placeholder="Apna naam"></div>
    <div><b>Test kab kiya</b><input type="text" data-field="when" placeholder="Tareekh"></div>
  </div>
</section>

<section>
  <h2>1. Ye document kya hai aur kaise use karein</h2>
  <div class="box howto">
    <ol>
      <li>Is document mein <b>${total} test cases</b> hain (TC-01 se TC-${String(total).padStart(2, "0")}). Inhe <b>order mein</b> karna hai. Order maine is tarah rakha hai ki pehle wale case ka data agle ke kaam aaye.</li>
      <li>Har test case mein 4 cheezein hain: <b>kaun</b> karega (aur kaunse browser mein), <b>pehle se kya chahiye</b>, <b>steps</b> (ek ke baad ek) aur <b>expected result</b> (kya dikhna chahiye).</li>
      <li>Steps karo. Jo dikhna chahiye wahi dikha to <b>Pass</b> chuno. Kuch alag dikha ya error aaya to <b>Fail</b> chuno aur remarks mein ek line likho ki kya dikha.</li>
      <li>Ye page aapka kaam apne aap yaad rakhta hai (is computer ke browser mein). Band karke dobara khol sakte ho.</li>
      <li>Sab ho jaye to upar <b>"Fail ki list copy karo"</b> dabao aur wo text chat mein bhej do. Jo fail hue wo main theek karunga.</li>
      <li>Chhapna ho to upar <b>"PDF / Print"</b> dabao.</li>
    </ol>
  </div>
  <div class="box">
    <b>Teen alag browser kyun?</b> Admin, Owner aur Customer ek saath alag login rehte hain. Ek hi browser mein do role mat rakho, nahi to purana login gadbad karta hai.
    <ul>
      <li><b>Browser A</b> = Chrome: <b>Admin</b></li>
      <li><b>Browser B</b> = Edge (ya Chrome ka doosra profile): <b>Owner</b></li>
      <li><b>Browser C</b> = Incognito window: <b>Customer</b> aur bina login wale kaam</li>
    </ul>
  </div>
</section>

<section>
  <h2>2. Tayyari (ek baar karna hai)</h2>
  <p class="intro">Terminal mein commands chalani hain. Database abhi khali hai (businesses hata diye gaye hain), isliye shuru se test hoga. Jo hota jaye uske saamne tick lagao.</p>
  <table>
    <thead><tr><th>Step</th><th>Kya karna hai</th><th>Kya dikhna chahiye</th><th>Ho gaya</th></tr></thead>
    <tbody>${setupHtml}</tbody>
  </table>
</section>

<section>
  <h2>3. Test accounts</h2>
  <table>
    <thead><tr><th>Role</th><th>Email</th><th>Password / login</th><th>Dhyan</th></tr></thead>
    <tbody>${ACCOUNTS.map((a) => `<tr>${a.map((x) => `<td>${esc(x)}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>
</section>

<section>
  <h2>4. Test ka order (ek nazar mein)</h2>
  <table>
    <thead><tr><th>Hissa</th><th>Test cases</th><th>Kitne</th></tr></thead>
    <tbody>${toc}</tbody>
  </table>
</section>

<h2 style="margin-top:50px">5. Test cases</h2>
${modulesHtml}

<section>
  <h2>6. Bug kaise bataein</h2>
  <div class="box">
    Jo test case <b>Fail</b> ho, uske remarks mein ye 3 baatein likho:
    <ul>
      <li><b>Kya kiya</b> (kaunsa step)</li>
      <li><b>Kya dikha</b> (jaise error ka text, ya galat page)</li>
      <li><b>Kya dikhna chahiye tha</b> (expected result)</li>
    </ul>
    Phir upar "Fail ki list copy karo" dabake wo text chat mein bhej do. Screenshot ho to saath mein bhejna.
  </div>
</section>

<section>
  <h2>7. Sign-off</h2>
  <div class="sign"><div>Tester ka naam aur sign</div><div>Tareekh</div><div>Natija (sab pass / fail baaki)</div></div>
</section>
</div>
<div class="toast" id="toast"></div>

<script>
const KEY = "lokal-lens-test-plan-v1";
let st = {}; try { st = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
const ids = ${JSON.stringify(MODULES.flatMap((m) => m.cases.map((c) => ({ id: c.id, title: c.title, role: c.role, steps: c.steps, expect: c.expect })))).replace(/</g, String.fromCharCode(92) + "u003c")};
function paint() {
  ids.forEach((c) => {
    const v = (st[c.id] || {}).v;
    document.querySelectorAll('input[name="r-' + c.id + '"]').forEach((r) => { r.checked = r.value === v; });
    const n = document.querySelector('[data-note="' + c.id + '"]'); if (n) n.value = (st[c.id] || {}).n || "";
  });
  document.querySelectorAll("[data-setup]").forEach((b) => { b.checked = !!(st["setup-" + b.dataset.setup]); });
  document.querySelectorAll("[data-field]").forEach((f) => { f.value = st["field-" + f.dataset.field] || ""; });
  stats();
}
function stats() {
  const t = ids.length, p = ids.filter((c) => (st[c.id] || {}).v === "pass").length, f = ids.filter((c) => (st[c.id] || {}).v === "fail").length;
  document.getElementById("bp").style.width = (p / t * 100) + "%"; document.getElementById("bf").style.width = (f / t * 100) + "%";
  document.getElementById("stats").textContent = p + " pass, " + f + " fail, " + (t - p - f) + " baaki (kul " + t + ")";
}
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.type === "radio" && t.name.startsWith("r-")) { const id = t.name.slice(2); st[id] = { ...(st[id] || {}), v: t.value }; save(); stats(); }
  if (t.dataset && t.dataset.setup) { st["setup-" + t.dataset.setup] = t.checked; save(); }
});
document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.note) { st[t.dataset.note] = { ...(st[t.dataset.note] || {}), n: t.value }; save(); }
  if (t.dataset && t.dataset.field) { st["field-" + t.dataset.field] = t.value; save(); }
});
const toast = (m) => { const t = document.getElementById("toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2400); };
document.getElementById("print").onclick = () => window.print();
document.getElementById("reset").onclick = () => { if (confirm("Saara progress mit jayega. Pakka?")) { st = {}; save(); paint(); } };
document.getElementById("copyFail").onclick = () => {
  const fails = ids.filter((c) => (st[c.id] || {}).v === "fail");
  if (!fails.length) { toast("Koi fail nahi hai"); return; }
  const text = "Lokal Lens test: jo fail hue\\n\\n" + fails.map((c) => c.id + " " + c.title + " (" + c.role + ")\\n   Kya dikha: " + ((st[c.id] || {}).n || "(likha nahi)") + "\\n   Dikhna chahiye tha: " + c.expect.join(" / ")).join("\\n\\n");
  navigator.clipboard.writeText(text).then(() => toast(fails.length + " fail ki list copy ho gayi. Chat mein paste karo"), () => prompt("Ye copy karo:", text));
};
paint();
</script>
</body>
</html>`;

fs.writeFileSync(path.join(ROOT, "TEST_PLAN.html"), html);
console.log(`Wrote TEST_PLAN.html with ${total} test cases`);
