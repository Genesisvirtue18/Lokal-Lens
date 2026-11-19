import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getBusinessCities, getBusinesses, getCityCategories } from "@/lib/api";
import { absoluteSiteUrl } from "@/lib/business-schema";
import { buildCollectionJsonLd, cityParagraphs, groupByCity, snippet } from "@/lib/seo";
import { businessDetailPath, categoryListingPath } from "@/lib/directory-data";
import { CategoryIcon } from "@/lib/category-icons";
import SiteHeader from "@/components/ds/SiteHeader";
import SiteFooter from "@/components/ds/SiteFooter";
import BusinessCard from "@/components/ds/BusinessCard";
import { Eyebrow } from "@/components/ds";
import { jsonLdString } from "@/lib/business-schema";

export const revalidate = 600;

async function loadCity(slug) {
  const { items = [] } = await getCityCategories();
  return groupByCity(items).get(String(slug).toLowerCase()) || null;
}

export async function generateMetadata({ params }) {
  const { city: slug } = await params;
  const city = await loadCity(slug);
  if (!city) return { title: "Page not found | Lokal Lens", robots: { index: false, follow: false } };
  const top = city.categories.slice(0, 3).map((item) => item.categoryName).join(", ");
  const title = `Local Businesses in ${city.name} – ${top} & More | Lokal Lens`;
  const description = snippet(`Find trusted local businesses in ${city.name}: ${top} and more. Compare ${city.total} listings with phone numbers, addresses, opening hours, photos and reviews.`);
  const canonical = absoluteSiteUrl(`/${city.slug}`);
  return { title, description, alternates: { canonical }, openGraph: { type: "website", title, description, url: canonical, images: [absoluteSiteUrl("/opengraph-image")] }, twitter: { card: "summary_large_image", title, description, images: [absoluteSiteUrl("/opengraph-image")] } };
}

export default async function CityPage({ params }) {
  const { city: slug } = await params;
  const city = await loadCity(slug);
  if (!city) notFound();
  const [{ items: cities = [] }, { items: topBusinesses = [] }, { items: allBusinesses = [] }] = await Promise.all([getBusinessCities(), getBusinesses({ city: city.name, limit: 12, sort: "rating" }), getBusinesses({ city: city.name, limit: 100 })]);
  const about = cityParagraphs({ cityName: city.name, total: city.total, categories: city.categories, businesses: allBusinesses });
  const cityNames = [...new Set(cities.map((item) => (typeof item === "string" ? item : item.name)).filter(Boolean))];
  const path = `/${city.slug}`;
  const jsonLd = buildCollectionJsonLd({
    name: `Local businesses in ${city.name}`,
    description: `Browse ${city.total} local businesses in ${city.name} by category.`,
    path,
    items: city.categories.map((item) => ({ name: `${item.categoryName} in ${city.name}`, path: categoryListingPath(city.name, { slug: item.categorySlug, _id: item.categoryId }) })),
    breadcrumb: [{ name: "Home", path: "/" }, { name: city.name }],
  });

  return (
    <main className="min-h-screen bg-[#f1f1ee] text-[#101115]">
      {jsonLd.map((schema, index) => <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(schema) }} />)}
      <SiteHeader variant="desktop" active="explore" cities={cityNames} city={city.name} cityBasePath="/directory" />
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 pb-16 pt-8 md:px-8 lg:px-[72px] lg:pt-12">
        <nav aria-label="Breadcrumb" className="text-[14px] text-[#4a4c55]"><ol className="flex flex-wrap items-center gap-2"><li><Link href="/" className="hover:text-[#002fa7]">Home</Link></li><li aria-hidden="true">/</li><li aria-current="page" className="font-medium text-[#101115]">{city.name}</li></ol></nav>

        <header className="flex flex-col gap-3">
          <Eyebrow>{city.total} listings</Eyebrow>
          <h1 className="text-[32px] font-semibold leading-10 tracking-[-0.0341em] md:text-[44px] md:leading-[52px]">Local businesses in {city.name}</h1>
          <p className="max-w-[760px] font-serif text-[18px] leading-7 text-[#4a4c55] md:text-[20px]">Find doctors, salons, restaurants, repair services and more in {city.name}. Every listing shows the phone number, address, opening hours, photos and customer reviews.</p>
        </header>

        <section aria-labelledby="city-categories" className="flex flex-col gap-5">
          <h2 id="city-categories" className="text-[24px] font-semibold leading-8 tracking-[-0.0208em]">Browse {city.name} by category</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {city.categories.map((item) => (
              <li key={item.categoryId} className="min-w-0">
                <Link href={categoryListingPath(city.name, { slug: item.categorySlug, _id: item.categoryId })} className="group flex items-center gap-4 rounded-[16px] border border-[#dcdbd5] bg-white p-5 transition-colors hover:border-[#002fa7]">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] bg-[#f1f1ee] text-[#002fa7]"><CategoryIcon icon={item.icon} name={item.categoryName} size={24} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-display text-[17px] font-semibold leading-6">{item.categoryName} in {city.name}</span><span className="block text-[14px] leading-5 text-[#6e7079]">{item.count} {item.count === 1 ? "listing" : "listings"}</span></span>
                  <ArrowRight size={18} className="shrink-0 text-[#4a4c55] transition group-hover:translate-x-1 group-hover:text-[#002fa7]" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {about.length > 0 && (
          <section aria-labelledby="city-about" className="flex max-w-[860px] flex-col gap-3">
            <h2 id="city-about" className="text-[24px] font-semibold leading-8 tracking-[-0.0208em]">Local businesses in {city.name} at a glance</h2>
            {about.map((text) => <p key={text} className="text-[16px] leading-7 text-[#2d2f36]">{text}</p>)}
          </section>
        )}

        {topBusinesses.length > 0 && (
          <section aria-labelledby="city-top" className="flex flex-col gap-5">
            <h2 id="city-top" className="text-[24px] font-semibold leading-8 tracking-[-0.0208em]">Top rated in {city.name}</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {topBusinesses.map((business) => <li key={business._id || business.id} className="flex"><BusinessCard business={{ ...business, href: businessDetailPath(business) }} layout="grid" /></li>)}
            </ul>
            <p><Link href={`/directory?city=${encodeURIComponent(city.name)}`} className="inline-flex items-center gap-1.5 font-display text-[15px] font-semibold text-[#002fa7] hover:underline">See all businesses in {city.name}<ArrowRight size={16} aria-hidden="true" /></Link></p>
          </section>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
