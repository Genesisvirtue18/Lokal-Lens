import { notFound, permanentRedirect } from "next/navigation";
import BusinessDetailPage from "@/components/BusinessDetailPage";
import DirectoryPage from "@/app/directory/page";
import { getCategories, getBusiness, getCityCategories } from "@/lib/api";
import { groupByCity } from "@/lib/seo";
import { absoluteSiteUrl } from "@/lib/business-schema";
import { businessDetailPath, categoryListingPath } from "@/lib/directory-data";

function displayWords(value = "") {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function generateMetadata({ params, searchParams }) {
  const { city, term, entry } = await params;
  const query = await searchParams;
  const hasCoordinates = query?.lat !== undefined || query?.lng !== undefined;
  const termSlug = term.toLowerCase();
  if (entry.endsWith("_BZDET")) {
    const business = await getBusiness(termSlug);
    if (!business) return { title: "Page not found | Lokal Lens", robots: { index: false, follow: false } };
    const place = [business.address?.locality, business.address?.city || displayWords(city)].filter(Boolean).join(", ");
    const title = `${business.name} - ${business.category?.name || "Business"} in ${place} | Lokal Lens`;
    const summary = (business.tagline ? `${business.tagline}. ` : "") + (business.description || `Contact ${business.name} in ${place}. See address, phone number, opening hours, photos and services.`);
    const description = summary.length > 158 ? `${summary.slice(0, 155).trimEnd()}...` : summary;
    const image = [business.images?.[0], business.logo].find((value) => typeof value === "string" && /^https?:\/\//.test(value));
    const canonical = absoluteSiteUrl(businessDetailPath(business));
    return {
      title, description, alternates: { canonical },
      openGraph: { type: "website", title, description, url: canonical, ...(image ? { images: [{ url: image, alt: business.name }] } : {}) },
      twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) },
    };
  }
  const { items = [] } = await getCategories({ limit: 100 });
  const category = items.find((item) => item.slug === termSlug);
  const categoryName = category?.name || displayWords(term);
  const cityName = displayWords(city);
  return {
    title: `Best ${categoryName} in ${cityName} - Phone Numbers, Address & Reviews | Lokal Lens`,
    description: `Looking for ${categoryName.toLowerCase()} in ${cityName}? Compare top-rated local listings with verified phone numbers, addresses, photos, opening hours and reviews on Lokal Lens.`,
    openGraph: { type: "website", title: `Best ${categoryName} in ${cityName} | Lokal Lens`, description: `Compare top-rated ${categoryName.toLowerCase()} in ${cityName} with phone numbers, addresses and reviews.`, images: [absoluteSiteUrl("/opengraph-image")] },
    alternates: category ? { canonical: absoluteSiteUrl(categoryListingPath(cityName, category)) } : undefined,
    ...(!category || hasCoordinates ? { robots: { index: false, follow: Boolean(category) } } : {}),
  };
}

export default async function SeoDirectoryRoute({ params, searchParams }) {
  const { city, term, entry } = await params;
  const termSlug = term.toLowerCase();
  if (entry.endsWith("_BZDET")) {
    const business = await getBusiness(termSlug);
    if (!business) notFound();
    // A listing lives at one address. Old names, other cities or a wrong id all lead there with a permanent redirect.
    const canonical = businessDetailPath(business);
    if (decodeURIComponent(canonical).toLowerCase() !== decodeURIComponent(`/${city}/${term}/${entry}`).toLowerCase()) permanentRedirect(canonical);
    return <BusinessDetailPage params={Promise.resolve({ slug: termSlug })} />;
  }
  if (!entry.startsWith("nct-")) notFound();
  // A category page exists only for a city that really has listings in that category, at the address built from the category id.
  const { items: pairs = [] } = await getCityCategories();
  const cityEntry = groupByCity(pairs).get(String(city).toLowerCase());
  const pair = cityEntry?.categories.find((item) => item.categorySlug === termSlug);
  if (!pair) notFound();
  const canonical = categoryListingPath(cityEntry.name, { slug: pair.categorySlug, _id: pair.categoryId });
  if (decodeURIComponent(canonical).toLowerCase() !== decodeURIComponent(`/${city}/${term}/${entry}`).toLowerCase()) permanentRedirect(canonical);
  return <DirectoryPage searchParams={searchParams} routeCity={city} routeCategory={termSlug} />;
}
