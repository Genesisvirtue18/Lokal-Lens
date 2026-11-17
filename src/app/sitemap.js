import { getBusinesses, getCategories } from "@/lib/api";
import { absoluteSiteUrl } from "@/lib/business-schema";
import { businessDetailPath, categoryListingPath } from "@/lib/directory-data";

// Search engines get one URL per business, plus a landing page for every city + category pair that has listings.
export const revalidate = 3600;
const PAGE_SIZE = 100;
const MAX_PAGES = 100;

export default async function sitemap() {
  const entries = [
    { url: absoluteSiteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteSiteUrl("/directory"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteSiteUrl("/categories"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteSiteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
  ];

  const { items: categories = [] } = await getCategories({ limit: 100 });
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const landingPages = new Map();

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { items = [], pagination } = await getBusinesses({ page, limit: PAGE_SIZE, sort: "newest" });
    for (const business of items) {
      entries.push({ url: absoluteSiteUrl(businessDetailPath(business)), lastModified: business.updatedAt ? new Date(business.updatedAt) : undefined, changeFrequency: "weekly", priority: 0.7 });
      const city = business.address?.city;
      const category = categoryBySlug.get(business.category?.slug) || business.category;
      if (city && category?.slug) {
        const path = categoryListingPath(city, category);
        if (!landingPages.has(path)) landingPages.set(path, { url: absoluteSiteUrl(path), changeFrequency: "daily", priority: 0.8 });
      }
    }
    const totalPages = pagination?.totalPages ?? (items.length < PAGE_SIZE ? page : page + 1);
    if (items.length < PAGE_SIZE || page >= totalPages) break;
  }

  return [...entries, ...landingPages.values()];
}
