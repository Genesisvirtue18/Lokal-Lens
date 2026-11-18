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
