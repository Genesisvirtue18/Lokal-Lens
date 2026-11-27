import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { Clock, Info, Tag } from "lucide-react";
import { getBusinessCities, getOffers } from "@/lib/api";
import { businessDetailPath } from "@/lib/directory-data";
import SiteHeader from "@/components/ds/SiteHeader";
import SiteFooter from "@/components/ds/SiteFooter";
import { Button, Eyebrow, cx } from "@/components/ds";

export const metadata = { title: "Offers near you | Lokal Lens", description: "Live offers from local businesses near you.", alternates: { canonical: "/offers" } };

function endsIn(value) {
  if (!value) return "";
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
  if (days <= 0) return "Ends today";
  return days === 1 ? "Ends tomorrow" : `Ends in ${days} days`;
}
const validTill = (value) => (value ? `Valid till ${new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "No end date");

function OfferCard({ offer }) {
  const { business } = offer;
  const href = businessDetailPath({ _id: business._id, slug: business.slug, category: business.category, categorySlug: business.categorySlug, address: { city: business.city } });
  const ends = endsIn(offer.validUntil);
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-[16px] border border-[#dcdbd5] bg-white">
      <Link href={href} className="relative block h-[168px] shrink-0 bg-[#f7f7f4]" aria-label={`View ${business.name}`}>
        {business.image && <Image src={business.image} alt="" fill unoptimized sizes="306px" className="object-cover" />}
        <span className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
          {offer.occasion ? <span className="rounded-full bg-[#f4b8c8] px-2.5 py-1 font-eyebrow text-[#101115]">{offer.occasion}</span> : <span />}
          {ends && <span className="inline-flex items-center gap-1 rounded-full bg-[#101115] px-2.5 py-1 font-display text-[13px] font-medium leading-[18px] text-white"><Clock size={12} aria-hidden="true" />{ends}</span>}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="truncate font-display text-[13px] font-medium leading-[18px] text-[#4a4c55]">{business.name}</p>
        <h3 className="line-clamp-2 font-display text-[16px] font-semibold leading-6">{offer.title}</h3>
        <p className="font-meta text-[#6e7079]">{[validTill(offer.validUntil), business.locality || business.city].filter(Boolean).join(" · ")}</p>
        {offer.code && <p className="w-fit rounded-[8px] bg-[#e6ebf7] px-2.5 py-1 font-meta text-[#002fa7]">Code {offer.code}</p>}
        <div className="mt-auto flex items-center gap-2 pt-2">
          <Button type="primary" size="s" href={href} className="flex-1">View offer</Button>
        </div>
      </div>
    </article>
  );
}

export default async function OffersPage({ searchParams }) {
  const params = (await searchParams) || {};
  const cookieStore = await cookies();
  const { items: cityItems = [] } = await getBusinessCities();
  const cities = cityItems.map((city) => (typeof city === "string" ? city : city.name)).filter(Boolean);
  const requested = typeof params.city === "string" ? params.city : decodeURIComponent(cookieStore.get("lokal_city")?.value || "");
  const city = cities.find((name) => name.toLowerCase() === requested.toLowerCase()) || "";
  const occasion = typeof params.occasion === "string" ? params.occasion : "";
  const { items = [], total = 0, occasions = [] } = await getOffers({ ...(city ? { city } : {}), ...(occasion ? { occasion } : {}), limit: 24 });
  const chipHref = (value) => { const query = new URLSearchParams(); if (city) query.set("city", city); if (value) query.set("occasion", value); return `/offers${query.size ? `?${query}` : ""}`; };

  return (
    <main className="min-h-screen bg-[#f1f1ee] text-[#101115]">
      <SiteHeader variant="desktop" active="offers" cities={cityItems} city={city} cityBasePath="/offers" />
      <section className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 pb-4 pt-10 md:px-8 lg:px-[72px]">
        <Eyebrow>Live offers{city ? ` · ${city}` : ""}</Eyebrow>
        <h1 className="text-[32px] font-semibold leading-10 tracking-[-0.0341em] md:text-[44px] md:leading-[52px]">Offers near you</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {[{ label: "All", value: "" }, ...occasions.map((value) => ({ label: value, value }))].map((chip) => (
            <Link key={chip.label} href={chipHref(chip.value)} className={cx("inline-flex h-10 items-center rounded-full border px-3.5 font-display text-[14px] font-medium", (occasion || "") === chip.value ? "border-[#002fa7] bg-[#e6ebf7] text-[#002fa7]" : "border-[#dcdbd5] bg-white hover:border-[#101115]")}>{chip.label}</Link>
          ))}
          <span className="ml-auto text-[14px] font-semibold leading-5">{total} live {total === 1 ? "offer" : "offers"}</span>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 pb-20 pt-4 md:px-8 lg:px-[72px]">
        {items.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{items.map((offer) => <OfferCard key={offer._id} offer={offer} />)}</div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-[16px] border border-[#dcdbd5] bg-white px-6 py-16 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[#f1f1ee] text-[#002fa7]"><Tag size={24} aria-hidden="true" /></span>
            <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.02em]">No live offers {city ? `in ${city} ` : ""}right now</h2>
            <p className="max-w-[460px] text-[16px] leading-6 text-[#4a4c55]">Businesses post offers for festivals and seasons. Check back soon, or browse listings to contact a business directly.</p>
            <div className="mt-2 flex flex-wrap justify-center gap-3"><Button type="primary" href="/directory">Explore businesses</Button><Button type="secondary" href="/add-business">Post your own offer</Button></div>
          </div>
        )}
        <p className="mt-6 flex items-center gap-2 rounded-[12px] bg-[#f7f7f4] p-3.5 text-[14px] leading-5 text-[#4a4c55]"><Info size={16} className="shrink-0" aria-hidden="true" />Offers are posted and priced by businesses. Expired offers are removed automatically. Lokal Lens doesn’t process payments.</p>
      </section>
      <SiteFooter />
    </main>
  );
}
