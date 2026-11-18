import Link from "next/link";
import { CategoryIcon } from "@/lib/category-icons";
import Image from "next/image";
import { cookies } from "next/headers";
import { ArrowRight, Check, Eye, Phone, Search, Sparkles, Tag } from "lucide-react";
import { getBusinesses, getCategories, getBusinessCities, getOffers } from "@/lib/api";
import { toHomeBusiness } from "@/lib/directory-data";
import SearchBox from "@/components/SearchBox";
import UseMyLocationButton from "@/components/UseMyLocationButton";
import SiteHeader from "@/components/ds/SiteHeader";
import SiteFooter from "@/components/ds/SiteFooter";
import BusinessCard from "@/components/ds/BusinessCard";
import { Button, Eyebrow, cx } from "@/components/ds";
import { buildSiteJsonLd, jsonLdString } from "@/lib/business-schema";


// Figma lists the categories in this order; anything else follows alphabetically.
const CATEGORY_ORDER = ["restaurants", "home services", "beauty", "shopping", "automotive", "professional", "education", "health"];
const orderOf = (name) => { const index = CATEGORY_ORDER.findIndex((key) => String(name).toLowerCase().includes(key)); return index === -1 ? 99 : index; };

const HERO_PHOTOS = [
  { src: "/figma/hero-cafe.jpg", alt: "Cafe interior with a coffee counter", className: "left-0 top-16 h-[380px] w-[330px]" },
  { src: "/figma/hero-salon.jpg", alt: "Salon chairs by a window", className: "left-[350px] top-0 h-[210px] w-[250px]" },
  { src: "/figma/hero-bakery.jpg", alt: "Bakery counter with fresh bread", className: "left-[350px] top-[230px] h-[300px] w-[250px]" },
  { src: "/figma/hero-tailor.jpg", alt: "Tailor at a sewing machine", className: "left-[90px] top-[464px] h-[136px] w-[240px]" },
];

const AREA_PHOTOS = {
  bengaluru: "/figma/area-bengaluru.jpg", bangalore: "/figma/area-bengaluru.jpg", mumbai: "/figma/area-mumbai.jpg", delhi: "/figma/area-delhi.jpg", "new delhi": "/figma/area-delhi.jpg",
  kolkata: "/figma/area-kolkata.jpg", jaipur: "/figma/area-jaipur.jpg", chennai: "/figma/area-chennai.jpg",
};

function SectionHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex max-w-[720px] flex-col gap-3">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-[34px] md:leading-[42px]">{title}</h2>
        {subtitle && <p className="font-serif text-[18px] leading-7 text-[#4a4c55] md:text-[20px]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function CategoryCard({ category }) {
  const examples = category.children?.slice(0, 4).map((item) => item.name).join(" · ") || `Explore local ${category.name.toLowerCase()}`;
  return (
    <Link href={`/directory?category=${encodeURIComponent(category.slug || category.name)}`} className="group flex flex-col gap-5 rounded-[16px] border border-[#dcdbd5] bg-white p-6 transition-colors hover:border-[#002fa7]">
      <div className="flex items-center justify-between">
        <span className="grid h-12 w-12 place-items-center rounded-[12px] bg-[#f1f1ee] text-[#002fa7]"><CategoryIcon icon={category.icon} name={category.name} size={24} /></span>
        <ArrowRight size={20} className="text-[#4a4c55] transition group-hover:translate-x-1 group-hover:text-[#002fa7]" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-[18px] font-semibold leading-[26px] tracking-[-0.0111em]">{category.name}</h3>
        <p className="line-clamp-2 text-[14px] leading-5 text-[#4a4c55]">{examples}</p>
      </div>
    </Link>
  );
}

const readCookie = (store, name) => { try { return decodeURIComponent(store.get(name)?.value || ""); } catch { return ""; } };

export default async function Home({ searchParams }) {
  const params = (await searchParams) || {};
  const cookieStore = await cookies();
  const { items: cityItems = [] } = await getBusinessCities();
  const requestedCity = typeof params.city === "string" ? params.city : readCookie(cookieStore, "lokal_city");
  const cities = cityItems.map((city) => (typeof city === "string" ? city : city.name)).filter(Boolean);
  const homeCity = cities.find((name) => name.toLowerCase() === requestedCity.trim().toLowerCase()) || "";
  const requestedCategory = typeof params.cat === "string" ? params.cat : "";

  const [{ items = [] }, { items: categoryItems = [] }, { items: offerItems = [], total: offerTotal = 0 }] = await Promise.all([
    getBusinesses({ limit: 24, ...(homeCity ? { city: homeCity } : {}) }),
    getCategories({ limit: 100 }),
    getOffers({ limit: 3, ...(homeCity ? { city: homeCity } : {}) }),
  ]);
  const businesses = items.map(toHomeBusiness);
  const roots = categoryItems.filter((category) => !category.parentCategory);
  const categories = roots
    .map((category) => ({ ...category, children: categoryItems.filter((child) => String(child.parentCategory?._id || child.parentCategory || "") === String(category._id)) }))
    .sort((a, b) => orderOf(a.name) - orderOf(b.name) || a.name.localeCompare(b.name));

  const tabs = categories.slice(0, 4);
  const activeTab = tabs.find((category) => (category.slug || category.name) === requestedCategory);
  const featured = (activeTab ? businesses.filter((business) => String(business.category || "").toLowerCase() === activeTab.name.toLowerCase()) : businesses).slice(0, 4);
  const areas = (homeCity ? cities : cities).slice(0, 6);
  const popularTerms = [...new Set(businesses.flatMap((business) => business.services || []).filter(Boolean))].slice(0, 5);
  const neighbourhoods = [...new Set(businesses.map((business) => business.address?.locality).filter(Boolean))].slice(0, 10);
  const galleryCards = businesses.filter((business) => business.image).slice(0, 2);
  const tabHref = (category) => { const query = new URLSearchParams(); if (homeCity) query.set("city", homeCity); if (category) query.set("cat", category.slug || category.name); return `/${query.size ? `?${query}` : ""}`; };
  const cityLabel = homeCity || "your city";

  return (
    <main className="min-h-screen overflow-x-clip bg-[#f1f1ee] text-[#101115]">
      {buildSiteJsonLd().map((schema) => <script key={schema["@type"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(schema) }} />)}
      <SiteHeader variant="desktop" cities={cityItems} city={homeCity} cityBasePath="/" />

      {/* Hero */}
      <section className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-[1440px] items-center gap-12 px-4 py-10 md:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10 xl:gap-14 lg:px-[72px] lg:pb-[72px] lg:pt-14">
        <div className="flex flex-col gap-6">
          <Eyebrow>Local business directory · India</Eyebrow>
          <h1 className="text-[44px] font-semibold leading-[48px] tracking-[-0.0347em] sm:text-[56px] sm:leading-[60px] lg:text-[clamp(52px,5vw,72px)] lg:leading-[1.06]">Find your next local favourite.</h1>
          <p className="max-w-[560px] text-[18px] leading-7 text-[#4a4c55]">Discover businesses, explore their services, and connect directly.</p>
          <div className="mt-2"><SearchBox key={homeCity} cities={cities} defaultCity={homeCity} /></div>
          <div className="flex flex-wrap items-center gap-3">
            <UseMyLocationButton compact />
            {popularTerms.length > 0 && <>
              <span className="font-display text-[13px] font-medium text-[#4a4c55]">Popular:</span>
              {popularTerms.map((term) => <Link key={term} href={`/directory?q=${encodeURIComponent(term)}${homeCity ? `&city=${encodeURIComponent(homeCity)}` : ""}`} className="inline-flex h-10 items-center rounded-full border border-[#dcdbd5] bg-white px-4 font-display text-[13px] font-medium transition-colors hover:border-[#101115]">{term}</Link>)}
            </>}
          </div>
        </div>

        <div className="relative mx-auto hidden h-[600px] w-[600px] lg:block lg:[zoom:.6] min-[1180px]:[zoom:.7] min-[1280px]:[zoom:.76] min-[1366px]:[zoom:.86] min-[1500px]:[zoom:1]">
          <div className="absolute left-0 top-0 z-10 flex flex-col gap-1">
            <p className="font-serif text-[20px] leading-7">On the wall this week</p>
            {areas.length > 0 && <p className="font-eyebrow text-[#4a4c55]">{neighbourhoods.slice(0, 3).join(" · ") || areas.slice(0, 3).join(" · ")}</p>}
          </div>
          {HERO_PHOTOS.map((photo, index) => (
            <div key={photo.src} className={cx("absolute overflow-hidden rounded-[16px] bg-[#e4e3de]", photo.className)}>
              <Image src={photo.src} alt={photo.alt} fill priority={index === 0} sizes="330px" className="object-cover" />
            </div>
          ))}
          {galleryCards[0] && <BusinessCard business={galleryCards[0]} layout="compact" className="absolute left-[280px] top-[470px] z-10 w-[320px] shadow-[0_12px_32px_rgba(16,17,21,.14)]" />}
          {galleryCards[1] && <BusinessCard business={galleryCards[1]} layout="compact" className="absolute -left-10 top-[330px] z-10 w-[340px] shadow-[0_12px_32px_rgba(16,17,21,.14)]" />}
        </div>
      </section>

      {/* Browse categories */}
      <section id="categories" className="mx-auto max-w-[1440px] px-4 py-12 md:px-8 lg:px-[72px] lg:py-[72px]">
        <SectionHeader eyebrow="Browse" title="Start with what you need" subtitle="From morning coffee to a reliable electrician, start with the kind of help you need." action={<Button type="secondary" href="/categories" trailingIcon={<ArrowRight size={18} aria-hidden="true" />}>View all categories</Button>} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.slice(0, 8).map((category) => <CategoryCard key={category._id || category.slug || category.name} category={category} />)}
        </div>
      </section>

      {/* Featured */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1440px] px-4 py-12 md:px-8 lg:px-[72px] lg:py-[72px]">
          <SectionHeader eyebrow="Featured" title={`Worth a visit in ${cityLabel}`} subtitle="Hand-picked listings with complete profiles and recent activity." action={<Button type="secondary" href={homeCity ? `/directory?city=${encodeURIComponent(homeCity)}` : "/directory"} trailingIcon={<ArrowRight size={18} aria-hidden="true" />}>View all businesses</Button>} />
          <div className="mt-8 flex flex-wrap gap-2">
            {[{ name: "All", slug: "" }, ...tabs].map((tab) => {
              const selected = tab.name === "All" ? !activeTab : activeTab?.name === tab.name;
              return <Link key={tab.name} href={tabHref(tab.slug === "" ? null : tab)} className={cx("inline-flex h-10 items-center rounded-full border px-4 font-display text-[14px] font-medium transition-colors", selected ? "border-[#002fa7] bg-[#002fa7] text-white" : "border-[#dcdbd5] bg-white hover:border-[#101115]")}>{tab.name}</Link>;
            })}
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 min-[1200px]:grid-cols-4">
            {featured.map((business) => <BusinessCard key={business._id || business.id || business.name} business={business} layout="grid" />)}
          </div>
          {!featured.length && <p className="mt-6 rounded-[16px] border border-[#dcdbd5] bg-[#f7f7f4] p-8 text-[14px] text-[#4a4c55]">No listings in this category yet. Try another category or city.</p>}
          <p className="mt-5 text-[13px] text-[#6e7079]">Sponsored placements are labelled on the photo. Ranking is never affected by payment alone.</p>
        </div>
      </section>

      {/* Offers + Ask Lokal */}
      <section className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-6 px-4 py-12 md:px-8 lg:grid-cols-2 lg:px-[72px] lg:py-20">
        <div className="flex flex-col gap-5 rounded-[20px] bg-[#fbe6ec] p-7 sm:p-8">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#002fa7]"><Tag size={20} aria-hidden="true" /></span>
          <div className="flex flex-col gap-2"><p className="font-eyebrow text-[#4a4c55]">Offers</p><h2 className="text-[28px] font-semibold leading-9 tracking-[-0.0294em]">Offers near you</h2><p className="text-[16px] leading-6 text-[#4a4c55]">Festival and seasonal deals posted by local businesses{offerTotal ? ` — ${offerTotal} live right now.` : "."}</p></div>
          {offerItems.length > 0 && <ul className="flex flex-col gap-2">{offerItems.map((offer) => <li key={offer._id}><Link href="/offers" className="flex items-center justify-between gap-3 rounded-[12px] bg-white px-4 py-3 hover:bg-[#f7f7f4]"><span className="min-w-0"><span className="block truncate font-display text-[15px] font-semibold">{offer.title}</span><span className="block truncate text-[14px] text-[#4a4c55]">{offer.business?.name}</span></span><ArrowRight size={18} className="shrink-0 text-[#002fa7]" aria-hidden="true" /></Link></li>)}</ul>}
          <div><Button type="secondary" href="/offers" trailingIcon={<ArrowRight size={18} aria-hidden="true" />}>See all offers</Button></div>
        </div>
        <div className="flex flex-col gap-5 rounded-[20px] border border-[#dcdbd5] bg-white p-7 sm:p-8">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-[#e6ebf7] text-[#002fa7]"><Sparkles size={20} aria-hidden="true" /></span>
          <div className="flex flex-col gap-2"><p className="font-eyebrow text-[#4a4c55]">Ask Lokal · Preview</p><h2 className="text-[28px] font-semibold leading-9 tracking-[-0.0294em]">Just ask for what you need</h2><p className="text-[16px] leading-6 text-[#4a4c55]">Describe it in your own words — “best dentist near me”, “vegan bakery” — and get matching listings.</p></div>
          <form action="/ask" method="get" className="flex h-14 items-center gap-2.5 rounded-[16px] border-2 border-[#002fa7] bg-white pl-3.5 pr-1.5">
            {homeCity && <input type="hidden" name="city" value={homeCity} />}
            <Sparkles size={20} className="shrink-0 text-[#002fa7]" aria-hidden="true" />
            <input name="q" placeholder="Ask for a business or service…" aria-label="Ask Lokal" className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[#6e7079]" />
            <button type="submit" className="h-11 shrink-0 rounded-[12px] bg-[#002fa7] px-4 font-display text-[14px] font-medium text-white hover:bg-[#00248a]">Ask</button>
          </form>
        </div>
      </section>

      {/* Discover by area */}
      {areas.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-4 py-12 md:px-8 lg:px-[72px] lg:py-20">
          <SectionHeader eyebrow="By area" title="Discover by area" subtitle="Every neighbourhood has a few places worth knowing." />
          <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 lg:h-[520px] lg:grid-cols-[520px_minmax(0,1fr)]">
            {areas.slice(0, 6).map((city, index) => {
              const key = city.toLowerCase().split(",")[0].trim();
              const cityBusiness = businesses.find((business) => (business.address?.city || business.city || "").toLowerCase() === city.toLowerCase() && business.image);
              const image = AREA_PHOTOS[key] || cityBusiness?.image || null;
              const count = cityItems.find((item) => typeof item !== "string" && item.name === city)?.count;
              const tile = (
                <Link key={city} href={`/directory?city=${encodeURIComponent(city)}`} className="group relative block min-h-[220px] overflow-hidden rounded-[16px] bg-[#1c2a52] lg:h-full">
                  {image && <Image src={image} alt="" fill unoptimized sizes="(max-width: 768px) 100vw, 40vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />}
                  <span className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-[12px] bg-white px-4 py-3">
                    <span className="min-w-0">
                      <span className="block truncate font-display text-[20px] font-semibold leading-6 tracking-[-0.02em]">{city.split(",")[0]}</span>
                      <span className="block truncate font-eyebrow text-[#4a4c55]">{count ? `${count} listings` : "Explore local businesses"}</span>
                    </span>
                    <ArrowRight size={18} className="shrink-0 text-[#002fa7]" aria-hidden="true" />
                  </span>
                </Link>
              );
              return tile;
            }).reduce((acc, tile, index, all) => {
              if (index === 0) acc.push(tile);
              if (index === 1) acc.push(<div key="rest" className="grid gap-4 lg:grid-rows-2"><div className="grid gap-4 sm:grid-cols-2">{all.slice(1, 3)}</div><div className="grid gap-4 sm:grid-cols-3">{all.slice(3, 6)}</div></div>);
              return acc;
            }, [])}
          </div>
          {neighbourhoods.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="mr-2 font-eyebrow text-[#4a4c55]">Neighbourhoods</span>
              {neighbourhoods.map((area) => <Link key={area} href={`/directory?locality=${encodeURIComponent(area)}`} className="inline-flex h-10 items-center rounded-full border border-[#dcdbd5] bg-white px-4 font-display text-[13px] font-medium hover:border-[#101115]">{area}</Link>)}
            </div>
          )}
        </section>
      )}

      {/* How it works */}
      <section id="how-it-works" className="bg-white">
        <div className="mx-auto max-w-[1440px] px-4 py-12 md:px-8 lg:px-[72px] lg:py-20">
          <SectionHeader eyebrow="How it works" title="Search, explore, connect." subtitle="No sign-up needed to browse or contact a business." />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[["01", "Search", "Type a business, service or category and choose your area.", Search], ["02", "Explore", "Compare photos, services, hours and reviews before you decide.", Eye], ["03", "Connect", "Call, WhatsApp, get directions or visit the business directly.", Phone]].map(([number, title, text, Icon]) => (
              <article key={number} className="flex flex-col gap-5 rounded-[16px] bg-[#f1f1ee] p-7">
                <div className="flex items-center justify-between"><span className="font-eyebrow text-[#002fa7]">{number}</span><span className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#002fa7]"><Icon size={20} aria-hidden="true" /></span></div>
                <div className="flex flex-col gap-2"><h3 className="text-[24px] font-semibold leading-8 tracking-[-0.02em]">{title}</h3><p className="text-[16px] leading-6 text-[#4a4c55]">{text}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Business owner */}
      <section className="mx-auto max-w-[1440px] px-4 pb-12 pt-8 md:px-8 lg:px-[72px] lg:pb-20">
        <div className="grid gap-10 overflow-hidden rounded-[24px] bg-[#002fa7] p-7 text-white sm:p-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-16 lg:p-16">
          <div className="flex flex-col gap-6">
            <p className="font-eyebrow text-[#f4b8c8]">For business owners</p>
            <h2 className="text-[34px] font-semibold leading-10 tracking-[-0.02em] text-white sm:text-[44px] sm:leading-[52px]">Make your business easier to discover.</h2>
            <p className="max-w-[540px] text-[18px] leading-7 text-white/85">A free Lokal Lens profile puts your services, photos, hours and contact details in front of nearby customers.</p>
            <ul className="flex flex-col gap-3 text-[16px] leading-6">
              {["Show services, prices (if you choose) and hours", "Get calls, WhatsApp messages and directions", "Verify your email and address to earn the verified badge"].map((text) => <li key={text} className="flex items-center gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/15"><Check size={14} aria-hidden="true" /></span>{text}</li>)}
            </ul>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="onblue" href="/add-business">Add Your Business</Button>
              <Button type="ghost" href="/categories" className="!text-white hover:!bg-white/10">Browse the directory</Button>
            </div>
          </div>
          {businesses[0] && (
            <div className="hidden rounded-[20px] bg-white p-3 text-[#101115] lg:block">
              <BusinessCard business={businesses[0]} layout="grid" sponsored={false} className="border-0" />
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
