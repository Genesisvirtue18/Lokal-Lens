// Field rules for the "Add your business" form. Every rule returns an error message, or "" when the value is fine.
export const INDIAN_STATES = ["Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"];

export const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const placeName = /^[\p{L}][\p{L}\s.'’()&-]*$/u;
const hasPhone = /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/;
const hasLink = /(https?:\/\/|www\.|\.com\b|\.in\b)/i;

// Cleans typed or pasted input so wrong characters never get into the form.
export const clean = {
  text: (value, max) => String(value).replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s{2,}/g, " ").replace(/^\s+/, "").slice(0, max),
  place: (value) => String(value).replace(/[^\p{L}\s.'’()&-]/gu, "").replace(/\s{2,}/g, " ").replace(/^\s+/, "").slice(0, 80),
  digits: (value, max) => String(value).replace(/\D/g, "").slice(0, max),
  // "+91 98765 43210", "098765 43210" and "9876543210" all become the 10-digit number.
  phone: (value) => { let digits = String(value).replace(/\D/g, ""); if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2); if (digits.length > 10 && digits.startsWith("0")) digits = digits.slice(1); return digits.slice(0, 10); },
  website: (value) => { const text = String(value).trim(); return text && !/^https?:\/\//i.test(text) ? `https://${text}` : text; },
};

export function check(key, data) {
  const value = typeof data[key] === "string" ? data[key].trim() : data[key];
  switch (key) {
    case "name":
      if (!value) return "Enter your business name.";
      if (value.length < 2) return "Business name must be at least 2 characters.";
      if (!/[\p{L}\p{N}]/u.test(value)) return "Business name needs letters or numbers.";
      if (hasPhone.test(value)) return "Don’t put a phone number in the name.";
      return "";
    case "category":
      return value ? "" : "Choose a primary category.";
    case "description":
      if (!value) return "Add a short description.";
      if (value.length < 20) return `Add a little more — at least 20 characters (${value.length} so far).`;
      if (hasPhone.test(value)) return "Remove the phone number — customers get it as a Call button.";
      if (hasLink.test(value)) return "Remove web links — add your website in the contact step.";
      if (/(?:₹|rs\.?\s?\d|inr\s?\d)/i.test(value)) return "Remove prices — add them under Services.";
      return "";
    case "addressLine1":
      if (!value) return "Enter your building and street.";
      if (value.length < 3) return "Enter a fuller address, like “12, MG Road”.";
      if (!/[\p{L}]/u.test(value)) return "The address needs a street or building name.";
      return "";
    case "locality":
      if (value && !placeName.test(value)) return "Use letters only, like “Indiranagar”.";
      return "";
    case "city":
      if (!value) return "Enter your city.";
      if (!placeName.test(value) || value.length < 2) return "Use letters only, like “Bengaluru”.";
      return "";
    case "state":
      return value ? "" : "Choose your state.";
    case "postalCode":
      if (!value) return "Enter your 6-digit PIN code.";
      if (!/^[1-9]\d{5}$/.test(value)) return "A PIN code has 6 digits and doesn’t start with 0.";
      return "";
    case "tagline":
      if (value && value.length > 160) return "Keep the tagline under 160 characters.";
      if (value && (hasPhone.test(value) || hasLink.test(value))) return "Remove phone numbers and links from the tagline.";
      return "";
    case "establishedYear":
      if (value && (Number(value) < 1900 || Number(value) > new Date().getFullYear())) return "Enter a year between 1900 and this year.";
      return "";
    case "alternatePhone":
      if (value && !/^[6-9]\d{9}$/.test(value)) return "Enter a 10-digit mobile number starting with 6, 7, 8 or 9.";
      if (value && value === data.phone) return "This is the same as your main phone.";
      return "";
    case "facebook":
    case "instagram":
    case "youtube": {
      if (!value) return "";
      const hosts = { facebook: ["facebook.com", "fb.com"], instagram: ["instagram.com"], youtube: ["youtube.com", "youtu.be"] }[key];
      try { const url = new URL(value); if (!["http:", "https:"].includes(url.protocol) || !hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) throw new Error("bad"); return ""; }
      catch { return `Paste your ${key[0].toUpperCase()}${key.slice(1)} page link, like https://${hosts[0]}/yourpage.`; }
    }
    case "gstNumber":
      if (value && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(String(value).toUpperCase())) return "A GST number has 15 characters, like 29ABCDE1234F1Z5.";
      return "";
    case "landmark":
      return value && value.length > 150 ? "Keep the landmark under 150 characters." : "";
    case "phone":
      if (!value) return "Enter your mobile number.";
      if (!/^[6-9]\d{9}$/.test(value)) return "Enter a 10-digit mobile number starting with 6, 7, 8 or 9.";
      return "";
    case "whatsapp":
      if (value && !/^[6-9]\d{9}$/.test(value)) return "Enter a 10-digit mobile number starting with 6, 7, 8 or 9.";
      return "";
    case "email":
      if (!value) return "Enter your email address.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return "Enter a valid email, like name@example.com.";
      return "";
    case "website": {
      if (!value) return "";
      try { const url = new URL(value); if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".")) throw new Error("bad"); return ""; }
      catch { return "Enter a valid website, like https://example.com."; }
    }
    case "services":
      return data.services.length ? "" : "Add at least one service or product.";
    case "hours": {
      const open = DAYS.filter((day) => data.hours[day].open);
      if (!open.length) return "Open at least one day, or go back and tell customers to call.";
      const bad = open.find((day) => !data.hours[day].opens || !data.hours[day].closes || data.hours[day].opens >= data.hours[day].closes);
      return bad ? `${bad[0].toUpperCase()}${bad.slice(1)}: closing time must be after opening time.` : "";
    }
    default:
      return "";
  }
}

export const STEP_FIELDS = [
  ["name", "category", "tagline", "description", "establishedYear"],
  ["addressLine1", "locality", "city", "state", "postalCode", "landmark"],
  ["services", "hours"],
  ["phone", "alternatePhone", "whatsapp", "email", "website", "facebook", "instagram", "youtube", "gstNumber"],
];

export const BUSINESS_TYPES = [["shop", "Shop / retail"], ["restaurant", "Restaurant / café"], ["service_provider", "Service provider"], ["clinic", "Clinic / healthcare"], ["institute", "Institute / school"], ["manufacturer", "Manufacturer"], ["wholesaler", "Wholesaler"], ["online", "Online business"], ["other", "Other"]];
export const PAYMENT_MODES = [["cash", "Cash"], ["upi", "UPI"], ["debit_card", "Debit card"], ["credit_card", "Credit card"], ["net_banking", "Net banking"], ["cheque", "Cheque"], ["emi", "EMI"], ["wallet", "Wallets"]];
export const LANGUAGES = ["English", "Hindi", "Bengali", "Marathi", "Telugu", "Tamil", "Gujarati", "Urdu", "Kannada", "Malayalam", "Punjabi", "Odia"];
export const AMENITY_SUGGESTIONS = ["Free Wi-Fi", "Parking", "Wheelchair accessible", "Air conditioned", "Home delivery", "Card & UPI accepted", "Online booking", "Women-friendly", "Child-friendly", "Open late"];
export const PRICE_RANGES = [["budget", "₹ Budget"], ["moderate", "₹₹ Moderate"], ["expensive", "₹₹₹ Premium"], ["luxury", "₹₹₹₹ Luxury"]];
export const DOC_TYPES = [["shop_license", "Shop licence / signboard photo"], ["gst_certificate", "GST certificate"], ["msme_certificate", "MSME certificate"], ["pan_card", "PAN card"], ["other", "Utility bill / other"]];

export function checkOffer(draft, existing) {
  const title = String(draft?.title || "").trim();
  if (title.length < 3) return "Give the offer a short title, like “20% off Diwali packages”.";
  if (hasPhone.test(title)) return "Remove the phone number from the title.";
  if (draft.code && !/^[A-Za-z0-9]{3,20}$/.test(draft.code)) return "A code uses 3–20 letters or numbers.";
  if (!draft.validUntil) return "Pick the last date the offer is valid.";
  if (new Date(`${draft.validUntil}T23:59:59`) < new Date()) return "That date has already passed.";
  if (existing.some((item) => item.title.toLowerCase() === title.toLowerCase())) return "You’ve already added an offer with this title.";
  if (existing.length >= 20) return "You can add up to 20 offers.";
  return "";
}

export function checkFaq(draft, existing) {
  const question = String(draft?.question || "").trim();
  const answer = String(draft?.answer || "").trim();
  if (question.length < 5) return "Write the question (at least 5 characters).";
  if (answer.length < 5) return "Write the answer (at least 5 characters).";
  if (existing.some((item) => item.question.toLowerCase() === question.toLowerCase())) return "You’ve already added this question.";
  if (existing.length >= 15) return "You can add up to 15 questions.";
  return "";
}

export function checkService(draft, existing) {
  const name = String(draft?.name || "").trim();
  if (name.length < 2) return "Enter the service or product name.";
  if (!/[\p{L}\p{N}]/u.test(name)) return "The name needs letters or numbers.";
  if (existing.some((item) => item.name.toLowerCase() === name.toLowerCase())) return "You’ve already added this one.";
  const from = draft.priceFrom === "" || draft.priceFrom === undefined ? null : Number(draft.priceFrom);
  const to = draft.priceTo === "" || draft.priceTo === undefined ? null : Number(draft.priceTo);
  if (from !== null && (!Number.isFinite(from) || from <= 0)) return "Price must be more than ₹0 — or leave it empty.";
  if (to !== null && from === null) return "Add the starting price too, or clear “Up to”.";
  if (to !== null && to <= from) return "“Up to” must be more than the starting price.";
  if (existing.length >= 100) return "You can add up to 100 services.";
  return "";
}

export function checkSpecialHours(draft, existing) {
  const label = String(draft?.label || "").trim();
  if (label.length < 2) return "Enter the occasion, like “Diwali”.";
  if (!draft.date) return "Pick the date.";
  if (new Date(`${draft.date}T23:59:59`) < new Date()) return "That date has already passed.";
  if (existing.some((item) => item.date === draft.date)) return "You’ve already set hours for that date.";
  return "";
}
