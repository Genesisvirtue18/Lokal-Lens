import { notFound, permanentRedirect } from "next/navigation";
import BusinessDetailPage from "@/components/BusinessDetailPage";
import { getBusiness } from "@/lib/api";
import { absoluteSiteUrl } from "@/lib/business-schema";
import { businessDetailPath } from "@/lib/directory-data";

// A business page: /<city>/<category>/<business-name>/<id>_BZDET

function displayWords(value = "") {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function generateMetadata({ params }) {
  const { city, entry, id } = await params;
  const business = id.endsWith("_BZDET") ? await getBusiness(entry.toLowerCase()) : null;
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

export default async function BusinessRoute({ params }) {
  const { city, term, entry, id } = await params;
  if (!id.endsWith("_BZDET")) notFound();
  const slug = entry.toLowerCase();
  const business = await getBusiness(slug);
  if (!business) notFound();
  // A listing lives at one address. Old names, another city or category, or a wrong id all lead there with a permanent redirect.
  const canonical = businessDetailPath(business);
  if (decodeURIComponent(canonical).toLowerCase() !== decodeURIComponent(`/${city}/${term}/${entry}/${id}`).toLowerCase()) permanentRedirect(canonical);
  return <BusinessDetailPage params={Promise.resolve({ slug })} />;
}
