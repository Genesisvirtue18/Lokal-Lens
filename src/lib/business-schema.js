import { businessDetailPath } from "@/lib/directory-data";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

const businessTypes = [
  [/dent/, "Dentist"],
  [/hospital/, "Hospital"],
  [/health|clinic|doctor|physician|medical/, "MedicalBusiness"],
  [/restaurant|cafe|food|bakery|dining/, "Restaurant"],
  [/hotel|resort|stay/, "Hotel"],
  [/beauty|salon|spa|wellness/, "BeautySalon"],
  [/educat|school|coaching|tutor|institute|class/, "EducationalOrganization"],
  [/auto|car |garage|mechanic|automotive/, "AutoRepair"],
  [/legal|lawyer|advocate/, "LegalService"],
  [/real estate|property|realty/, "RealEstateAgent"],
  [/electric|plumb|home service|repair|construction/, "HomeAndConstructionBusiness"],
  [/shop|store|retail|fashion|apparel/, "Store"],
  [/professional|consult|account|finance/, "ProfessionalService"],
];

const paymentNames = { cash: "Cash", upi: "UPI", debit_card: "Debit card", credit_card: "Credit card", net_banking: "Net banking", cheque: "Cheque", emi: "EMI", wallet: "Digital wallet" };

export function absoluteSiteUrl(path = "/") {
  return new URL(path, `${SITE_URL}/`).toString();
}

export function buildBusinessJsonLd(business, canonicalPath) {
  const category = String(business.category?.name || "").trim().toLowerCase();
  const specificType = businessTypes.find(([pattern]) => pattern.test(`${category} `))?.[1];
  const address = business.address || {};
  const schema = {
    "@context": "https://schema.org",
    "@type": specificType || "LocalBusiness",
    "@id": absoluteSiteUrl(canonicalPath),
    url: absoluteSiteUrl(canonicalPath),
    name: business.name,
  };
  if (business.description) schema.description = business.description;
  const images = [...new Set([business.logo, ...(business.images || [])].filter(isHttpUrl))];
  if (images.length) schema.image = images;
  if (business.phone) schema.telephone = business.phone;
  if (business.email) schema.email = business.email;
  const sameAs = [business.website, ...Object.values(business.socialLinks || {})].filter(isHttpUrl);
  if (sameAs.length) schema.sameAs = [...new Set(sameAs)];
  const postalAddress = {
    "@type": "PostalAddress",
    ...(address.addressLine1 || address.addressLine2 ? { streetAddress: [address.addressLine1, address.addressLine2].filter(Boolean).join(", ") } : {}),
    ...(address.locality || address.city ? { addressLocality: [address.locality, address.city].filter(Boolean).join(", ") } : {}),
    ...(address.state ? { addressRegion: address.state } : {}),
    ...(address.postalCode ? { postalCode: address.postalCode } : {}),
    ...(address.country ? { addressCountry: address.country } : {}),
  };
  if (Object.keys(postalAddress).length > 1) schema.address = postalAddress;
  const coordinates = business.location?.coordinates;
  if (Array.isArray(coordinates) && coordinates.length === 2 && coordinates.every(Number.isFinite)) {
    schema.geo = { "@type": "GeoCoordinates", longitude: coordinates[0], latitude: coordinates[1] };
  }
  if (business.priceRange) schema.priceRange = { budget: "₹", moderate: "₹₹", expensive: "₹₹₹", luxury: "₹₹₹₹" }[business.priceRange] || business.priceRange;
  if (business.tagline) schema.slogan = business.tagline;
  if (business.establishedYear) schema.foundingDate = String(business.establishedYear);
  if (Number(business.reviewCount) > 0 && Number(business.averageRating) > 0) {
    schema.aggregateRating = { "@type": "AggregateRating", ratingValue: Number(business.averageRating), reviewCount: Number(business.reviewCount), bestRating: 5, worstRating: 1 };
  }
  const payments = (business.paymentModes || []).map(mode => paymentNames[mode]).filter(Boolean);
  if (payments.length) schema.paymentAccepted = payments.join(", ");
  if ((business.languages || []).length) schema.knowsLanguage = business.languages;
  if ((business.serviceAreas || []).length) schema.areaServed = business.serviceAreas.map(name => ({ "@type": "Place", name }));
  if ((business.services || []).length) {
    schema.hasOfferCatalog = { "@type": "OfferCatalog", name: "Services", itemListElement: business.services.slice(0, 30).map(name => ({ "@type": "Offer", itemOffered: { "@type": "Service", name } })) };
  }
  const phones = [business.phone, business.alternatePhone, business.tollFree].filter(Boolean);
  if (phones.length) schema.contactPoint = phones.map((telephone, index) => ({ "@type": "ContactPoint", telephone, contactType: index === 2 ? "customer service" : "sales", areaServed: "IN" }));
  const hours = (business.workingHours || []).filter(item => !item.isClosed && (item.is24Hours || (item.opens && item.closes))).map(item => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: `https://schema.org/${item.day?.[0]?.toUpperCase()}${item.day?.slice(1)}`,
    opens: item.is24Hours ? "00:00" : item.opens,
    closes: item.is24Hours ? "23:59" : item.closes,
  }));
  if (hours.length) schema.openingHoursSpecification = hours;
  return schema;
}

export function buildBreadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, ...(item.path ? { item: absoluteSiteUrl(item.path) } : {}) })),
  };
}

export function buildFaqJsonLd(faqs = []) {
  const entries = faqs.filter(faq => faq?.question && faq?.answer);
  if (!entries.length) return null;
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: entries.map(faq => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) };
}

export function buildSiteJsonLd() {
  return [
    { "@context": "https://schema.org", "@type": "Organization", name: "Lokal Lens", url: absoluteSiteUrl("/"), logo: absoluteSiteUrl("/logo.png") },
    { "@context": "https://schema.org", "@type": "WebSite", name: "Lokal Lens", url: absoluteSiteUrl("/"), potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${absoluteSiteUrl("/directory")}?q={search_term_string}` }, "query-input": "required name=search_term_string" } },
  ];
}

export function buildDirectoryJsonLd(businesses, canonicalPath) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${absoluteSiteUrl(canonicalPath)}#businesses`,
    url: absoluteSiteUrl(canonicalPath),
    itemListElement: businesses.map((business, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: { "@type": "Thing", name: business.name, url: absoluteSiteUrl(businessDetailPath(business)) },
    })),
  };
}

export function jsonLdString(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

function isHttpUrl(value) {
  if (typeof value !== "string") return false;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}

