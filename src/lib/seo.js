import { absoluteSiteUrl } from "@/lib/business-schema";
import { toSeoSlug } from "@/lib/directory-data";

export const SITE_NAME = "Lokal Lens";

// Cut a description to a length search results actually show, without chopping a word in half.
export function snippet(text = "", max = 158) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 80)).replace(/[,;:.\- ]+$/, "")}…`;
}

export function cityPath(city) {
  return `/${toSeoSlug(city || "india") || "india"}`;
}

// All the city + category pairs that have listings, grouped by city slug.
export function groupByCity(pairs = []) {
  const cities = new Map();
  for (const pair of pairs) {
    const slug = toSeoSlug(pair.city);
    if (!slug) continue;
    const entry = cities.get(slug) || { slug, name: pair.city, total: 0, categories: [], updatedAt: 0 };
    entry.total += pair.count;
    entry.categories.push(pair);
    entry.updatedAt = Math.max(entry.updatedAt, pair.updatedAt ? new Date(pair.updatedAt).getTime() : 0);
    cities.set(slug, entry);
  }
  return cities;
}

export function buildCollectionJsonLd({ name, description, path, items = [], breadcrumb = [] }) {
  return [
    { "@context": "https://schema.org", "@type": "CollectionPage", name, description, url: absoluteSiteUrl(path), isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absoluteSiteUrl("/") } },
    ...(items.length ? [{ "@context": "https://schema.org", "@type": "ItemList", itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, url: absoluteSiteUrl(item.path) })) }] : []),
    ...(breadcrumb.length ? [{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: breadcrumb.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, ...(item.path ? { item: absoluteSiteUrl(item.path) } : {}) })) }] : []),
  ];
}

// ---- Plain-language summaries for city and city + category pages -------------------------------------------------------
// Every sentence is built from the listings themselves (counts, areas, services, ratings). Nothing is invented, and a sentence
// is left out when there is not enough data to say it truthfully.
const plural = (count, one, many = `${one}s`) => `${count.toLocaleString("en-IN")} ${count === 1 ? one : many}`;
const list = (items) => (items.length <= 1 ? items[0] || "" : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);
const topBy = (values, limit) => {
  const counts = new Map();
  for (const value of values) { const key = String(value || "").trim(); if (key) counts.set(key, (counts.get(key) || 0) + 1); }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
};
const verifiedCount = (businesses) => businesses.filter((item) => item.verificationStatus === "verified").length;
const bestRated = (businesses) => businesses.filter((item) => Number(item.reviewCount) > 0 && Number(item.averageRating) > 0).sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount)[0];

/** Paragraphs for a "Dentists in Ghaziabad" style page. `businesses` are all listings of that city and category (up to 100). */
export function categoryCityParagraphs({ cityName, categoryName, total, businesses = [] }) {
  const count = total || businesses.length;
  if (!count) return [];
  const noun = categoryName.toLowerCase();
  const out = [];
  const verified = verifiedCount(businesses);
  out.push(`${cityName} has ${plural(count, `${noun} listing`)} on Lokal Lens${verified ? `, ${verified === count || verified === businesses.length ? "all of them" : `${verified} of them`} Verified` : ""}. Each listing shows its phone number, address, opening hours and photos where the business has added them, so you can compare and contact a business directly.`);
  const areas = topBy(businesses.map((item) => item.address?.locality), 5);
  if (areas.length >= 2) out.push(`Listings are spread across areas such as ${list(areas.map(([name, n]) => `${name} (${n})`))}. Use the filters to narrow the list to your area.`);
  const services = topBy(businesses.flatMap((item) => item.services || []), 6);
  if (services.length >= 2) out.push(`Services businesses here list most often include ${list(services.map(([name]) => name))}.`);
  const best = bestRated(businesses);
  if (best) out.push(`${best.name} currently has the highest customer rating among these listings: ${Number(best.averageRating).toFixed(1)} out of 5 from ${plural(Number(best.reviewCount), "review")}.`);
  return out;
}

/** Paragraphs for a city hub page. `categories` are the city's category rows; `businesses` its listings (up to 100). */
export function cityParagraphs({ cityName, total, categories = [], businesses = [] }) {
  if (!total) return [];
  const out = [];
  const top = [...categories].sort((a, b) => b.count - a.count).slice(0, 3);
  out.push(`Lokal Lens lists ${plural(total, "local business", "local businesses")} in ${cityName} across ${plural(categories.length, "category", "categories")}${top.length ? `, most of them in ${list(top.map((item) => `${item.categoryName} (${item.count})`))}` : ""}.`);
  const areas = topBy(businesses.map((item) => item.address?.locality), 5);
  if (areas.length >= 2) out.push(`Areas with the most listings include ${list(areas.map(([name, n]) => `${name} (${n})`))}.`);
  const verified = verifiedCount(businesses);
  if (verified) out.push(`${plural(verified, "listing")} here ${verified === 1 ? "is" : "are"} Verified, meaning our team checked documents the business provided.`);
  const best = bestRated(businesses);
  if (best) out.push(`The highest-rated listing so far is ${best.name}, with ${Number(best.averageRating).toFixed(1)} out of 5 from ${plural(Number(best.reviewCount), "review")}.`);
  return out;
}
