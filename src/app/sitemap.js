import { getBusinesses, getCityCategories } from "@/lib/api";
import { absoluteSiteUrl } from "@/lib/business-schema";
import { businessDetailPath, categoryListingPath } from "@/lib/directory-data";
import { groupByCity } from "@/lib/seo";

// One URL per business, one landing page per city + category pair that has listings, and one hub page per city.
// A single sitemap holds up to 50,000 URLs. Past that, split it with generateSitemaps (see Next.js docs) and list the parts in robots.txt.
export const revalidate = 3600;
const PAGE_SIZE = 100;
const MAX_PAGES = 450;

export default async function sitemap() {
  const entries = [
    { url: absoluteSiteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteSiteUrl("/directory"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteSiteUrl("/categories"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteSiteUrl("/offers"), changeFrequency: "daily", priority: 0.6 },
    { url: absoluteSiteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteSiteUrl("/terms"), changeFrequency: "yearly", priority: 0.2 },
  ];

  const { items: pairs = [] } = await getCityCategories();
  for (const city of groupByCity(pairs).values()) {
    const lastModified = city.updatedAt ? new Date(city.updatedAt) : undefined;
    entries.push({ url: absoluteSiteUrl(`/${city.slug}`), lastModified, changeFrequency: "daily", priority: 0.85 });
    for (const pair of city.categories) entries.push({ url: absoluteSiteUrl(categoryListingPath(city.name, { slug: pair.categorySlug, _id: pair.categoryId })), lastModified: pair.updatedAt ? new Date(pair.updatedAt) : undefined, changeFrequency: "daily", priority: 0.8 });
  }

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { items = [], pagination } = await getBusinesses({ page, limit: PAGE_SIZE, sort: "newest" });
    for (const business of items) entries.push({ url: absoluteSiteUrl(businessDetailPath(business)), lastModified: business.updatedAt ? new Date(business.updatedAt) : undefined, changeFrequency: "weekly", priority: 0.7 });
    const totalPages = pagination?.totalPages ?? (items.length < PAGE_SIZE ? page : page + 1);
    if (items.length < PAGE_SIZE || page >= totalPages) break;
  }
  return entries;
}
