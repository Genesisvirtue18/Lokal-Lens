// Names for the parts of a listing an owner can change. Edits to an approved listing wait for an admin, and both sides show what is waiting.
export const FIELD_LABELS = {
  name: "Business name", tagline: "Tagline", description: "Description", businessType: "Business type", establishedYear: "Established year",
  category: "Category", subcategories: "Category", secondaryCategories: "Category", address: "Address", location: "Map pin", locationApproximate: "Map pin",
  phone: "Phone", alternatePhone: "Alternate phone", whatsapp: "WhatsApp", email: "Email", website: "Website", socialLinks: "Social links",
  services: "Services", serviceItems: "Services", workingHours: "Opening hours", specialHours: "Special days", images: "Photos", logo: "Logo",
  paymentModes: "Payments", languages: "Languages", priceRange: "Price level", amenities: "Facilities", homeDelivery: "Home delivery",
  faqs: "Questions", serviceMode: "Who you serve", serviceAreas: "Service areas", highlights: "Highlights", keywords: "Keywords", googlePlaceId: "Google Place",
};

export const labelsOfChanges = (keys = []) => [...new Set(keys.map((key) => FIELD_LABELS[key] || key))];

const time = (value) => { const [h, m] = String(value || "").split(":").map(Number); return Number.isNaN(h) ? "" : `${h % 12 || 12}:${String(m || 0).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const list = (items) => (Array.isArray(items) && items.length ? items.join(", ") : "");

/** A short, readable version of one field's value, for the "now / asked" comparison. Empty text means "not set". */
export function describeValue(key, value) {
  if (value === undefined || value === null || value === "") return "";
  if (key === "address" && typeof value === "object") return [value.addressLine1, value.addressLine2, value.landmark, value.locality, value.city, value.state, value.postalCode].filter(Boolean).join(", ");
  if (key === "workingHours" && Array.isArray(value)) return value.map((day) => `${String(day.day).slice(0, 3)} ${day.isClosed ? "closed" : `${time(day.opens)}–${time(day.closes)}`}`).join(" · ");
  if (key === "specialHours" && Array.isArray(value)) return value.map((day) => `${day.label} ${day.date || ""} ${day.isClosed === false ? `${time(day.opens)}–${time(day.closes)}` : "closed"}`.trim()).join(" · ");
  if (key === "serviceItems" && Array.isArray(value)) return value.map((item) => `${item.name}${item.priceFrom ? ` ₹${item.priceFrom}${item.priceTo ? `–₹${item.priceTo}` : "+"}` : ""}`).join(", ");
  if (key === "images") return Array.isArray(value) ? `${value.length} photo${value.length === 1 ? "" : "s"}` : "";
  if (key === "faqs" && Array.isArray(value)) return value.map((item) => item.question).join(" · ");
  if (key === "socialLinks" && typeof value === "object") return Object.entries(value).filter(([, url]) => url).map(([name, url]) => `${name}: ${url}`).join(", ");
  if (key === "location" && value?.coordinates) return `${Number(value.coordinates[1]).toFixed(5)}, ${Number(value.coordinates[0]).toFixed(5)}`;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return list(value.map((item) => (typeof item === "object" && item ? item.name || item.label || JSON.stringify(item) : item)));
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
