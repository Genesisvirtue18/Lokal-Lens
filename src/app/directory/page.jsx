import Link from "next/link";
import { ChevronDown, ChevronRight, LayoutGrid, List, LocateFixed, SearchX, SlidersHorizontal, X } from "lucide-react";
import { getBusinesses, getCategories, getBusinessCities, getFacets } from "@/lib/api";
import { toDirectoryBusiness } from "@/lib/directory-data";
import UseMyLocationButton from "@/components/UseMyLocationButton";
import SiteHeader from "@/components/ds/SiteHeader";
import { categoryCityParagraphs } from "@/lib/seo";
import SiteFooter from "@/components/ds/SiteFooter";
import BusinessCard from "@/components/ds/BusinessCard";
import DirectoryMapView from "@/components/DirectoryMapView";
import FilterDialog from "@/components/FilterDialog";
import AreaPicker from "@/components/AreaPicker";
import { Button, cx } from "@/components/ds";
import { absoluteSiteUrl, buildDirectoryJsonLd, jsonLdString } from "@/lib/business-schema";

export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const hasSearchState = Object.keys(params || {}).some(key => !["limit", "view"].includes(key));
  return { title: "Find Local Businesses Near You | Lokal Lens", description: "Discover local businesses by category, location, and distance.", alternates: { canonical: absoluteSiteUrl("/directory") }, ...(hasSearchState ? { robots: { index: false, follow: true } } : {}) };
}

function urlWith(params, changes = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) if (typeof value === "string" && value) query.set(key, value);
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === null || value === "") query.delete(key);
    else query.set(key, String(value));
  }
  return `/directory${query.size ? `?${query.toString()}` : ""}`;
}

function FilterChip({ label, href }) {
  return <Link href={href} aria-label={`Remove filter ${label}`} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#002fa7] bg-[#e6ebf7] pl-3.5 pr-2 font-display text-[14px] font-medium text-[#002fa7]">{label}<X size={16} aria-hidden="true" /></Link>;
}

const boxClass = "h-[18px] w-[18px] shrink-0 cursor-pointer accent-[#002fa7]";
const controlClass = "h-12 w-full rounded-[10px] border border-[#bdbcb5] bg-white px-3 text-[16px] text-[#101115] outline-none transition hover:border-[#101115] focus:border-2 focus:border-[#002fa7] focus:px-[11px]";

function Section({ title, children }) {
  return (
    <section className="rounded-[14px] border border-[#dcdbd5] bg-white">
      <h3 className="border-b border-[#ecebe7] px-4 py-3 font-display text-[13px] font-semibold uppercase leading-5 tracking-[0.06em] text-[#4a4c55]">{title}</h3>
      <div className="flex flex-col gap-0.5 px-2 py-2">{children}</div>
    </section>
  );
}
function QuickChip({ href, active, children }) {
  return <Link href={href} aria-pressed={active} className={cx("inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-full border px-4 font-display text-[14px] font-medium transition-colors", active ? "border-[#002fa7] bg-[#e6ebf7] text-[#002fa7]" : "border-[#bdbcb5] bg-white text-[#101115] hover:border-[#101115]")}>{children}</Link>;
}
function Option({ type = "checkbox", disabled, children, ...props }) {
  return <label className={cx("flex min-h-11 items-center gap-3 rounded-[10px] px-2 text-[15px] leading-6", disabled ? "cursor-not-allowed text-[#6e7079]" : "cursor-pointer hover:bg-[#f7f7f4]")}><input type={type} disabled={disabled} className={boxClass} {...props} />{children}</label>;
}

const displayCity = (value = "") => String(value).replace(/\b\w/g, (letter) => letter.toUpperCase());

export default async function DirectoryPage({ searchParams, routeCity, routeCategory }) {
  const rawParams = await searchParams;
  const params = Object.fromEntries(Object.entries(rawParams || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value]));
  const cityName = routeCity ? displayCity(routeCity.replace(/-/g, " ")) : params?.city;
  const categorySlug = routeCategory || params?.category;
  const page = Math.max(1, Number(params?.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params?.limit) || 24));
  const radiusMeters = Math.min(50000, Math.max(100, Number(params?.radiusMeters) || 10000));
  const hasCoordinates = params?.lat !== undefined && params?.lng !== undefined;
  // Map view is switched off for now (see DirectoryMapView). To bring it back, add "map" here and in `views` below.
  const view = ["grid", "list"].includes(params?.view) ? params.view : "grid";
  const [{ items: businessItems = [], pagination = {} }, { items: categoryItems = [] }, { items: cityItems = [] }, facets = {}] = await Promise.all([
    getBusinesses({ page, limit, q: params?.q, city: hasCoordinates ? undefined : cityName, locality: hasCoordinates ? undefined : params?.locality, state: hasCoordinates ? undefined : params?.state, category: categorySlug, verified: params?.verified, amenity: params?.amenity, minimumRating: params?.rating, hasPhotos: params?.hasPhotos, hasWebsite: params?.hasWebsite, lat: params?.lat, lng: params?.lng, radiusMeters, openNow: params?.openNow, sort: params?.sort === "distance" && !hasCoordinates ? "relevance" : params?.sort }),
    getCategories({ limit: 100 }), getBusinessCities(), getFacets({ city: hasCoordinates ? undefined : cityName, category: categorySlug, q: params?.q }),
  ]);
  // On a city + category landing page, describe it in words using all of its listings (not just this page of results).
  const isLanding = Boolean(routeCity && routeCategory) && page === 1 && !params?.q && !hasCoordinates;
  const landingItems = isLanding ? (await getBusinesses({ city: cityName, category: categorySlug, limit: 100 }).catch(() => ({ items: [] }))).items || [] : [];
  // Near-me search: if nothing is within the chosen distance, widen it step by step so the person never lands on an empty page.
  let nearbyItems = businessItems; let nearbyPagination = pagination; let usedRadius = radiusMeters;
  if (hasCoordinates && !params?.radiusLocked && nearbyItems.length === 0) {
    for (const wider of [25000, 50000].filter((value) => value > radiusMeters)) {
      const retry = await getBusinesses({ page: 1, limit, q: params?.q, category: categorySlug, verified: params?.verified, amenity: params?.amenity, minimumRating: params?.rating, hasPhotos: params?.hasPhotos, hasWebsite: params?.hasWebsite, lat: params?.lat, lng: params?.lng, radiusMeters: wider, openNow: params?.openNow, sort: params?.sort === "distance" ? "relevance" : params?.sort });
      if ((retry.items || []).length) { nearbyItems = retry.items; nearbyPagination = retry.pagination || {}; usedRadius = wider; break; }
    }
  }
  const widened = usedRadius !== radiusMeters;
  const businesses = nearbyItems.map(toDirectoryBusiness);
  const selectedCategory = categoryItems.find(item => item.slug === categorySlug);
  const directorySchema = buildDirectoryJsonLd(businessItems, "/directory");
  const resultCount = Number(nearbyPagination.totalItems) || businesses.length;
  const titleCategory = selectedCategory?.name || params?.q || "Businesses";
  const titleArea = [params?.locality, cityName].filter(Boolean).join(", ");
  const resultTitle = `${selectedCategory?.name || (params?.q ? `Results for “${params.q}”` : "Businesses")}${titleArea ? ` in ${titleArea}` : ""}`;
  const facetCounts = facets.counts || {};
  const selectedAmenities = String(params?.amenity || "").split(",").map(item => item.trim()).filter(Boolean);
  const amenityOptions = [...new Map([...(facets.amenities || []), ...selectedAmenities.map(name => ({ name, count: 0 }))].map(item => [item.name, item])).values()].slice(0, 10);
  // Every neighbourhood that has businesses (the chosen one is always listed, even if it has none under the other filters).
  const localityOptions = [...new Map([...(facets.localities || []), ...(params?.locality ? [{ name: params.locality, count: 0 }] : [])].map((item) => [item.name, item])).values()].slice(0, 200);
  const activeFilters = [
    params?.openNow === "true" && ["Open now", { openNow: "" }],
    params?.verified === "true" && ["Verified only", { verified: "" }],
    params?.hasPhotos === "true" && ["Has photos", { hasPhotos: "" }],
    params?.hasWebsite === "true" && ["Has website", { hasWebsite: "" }],
    params?.rating && [`${params.rating}+ rating`, { rating: "" }],
    params?.locality && [params.locality, { locality: "" }],
    ...selectedAmenities.map(name => [name, { amenity: selectedAmenities.filter(item => item !== name).join(",") }]),
  ].filter(Boolean);
  const clearAll = { openNow: "", verified: "", hasPhotos: "", hasWebsite: "", rating: "", amenity: "", locality: "", page: "" };
  const navigationParams = { ...params, city: params?.city || cityName, category: params?.category || categorySlug };
  const queryWithoutPage = { ...navigationParams, page: undefined };
  const pageHref = targetPage => urlWith(navigationParams, { page: targetPage });
  const shown = Math.min(page * limit, resultCount);
  const views = [["grid", "Grid", LayoutGrid], ["list", "List", List] /* , ["map", "Map", MapIcon] */];
  const cityLabel = cityName ? cityName.split(",").at(-1).trim() : "";

  return <main className="min-h-screen bg-[#f1f1ee] text-[#101115]">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(directorySchema) }} />
    <SiteHeader variant="compact" active="explore" cities={cityItems} city={cityName || ""} cityBasePath="/directory" query={params?.q || ""} />

    {/* Results header */}
    <section className="mx-auto flex max-w-[1440px] flex-col gap-5 px-4 pb-6 pt-7 md:px-8 lg:px-[72px]">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[14px] leading-5 text-[#4a4c55]">
        <Link href="/" className="text-[#002fa7] hover:underline">Home</Link><ChevronRight size={14} aria-hidden="true" />
        {cityLabel && <><Link href={`/directory?city=${encodeURIComponent(cityName)}`} className="text-[#002fa7] hover:underline">{cityLabel}</Link><ChevronRight size={14} aria-hidden="true" /></>}
        {params?.locality && <><Link href={urlWith(params, { locality: "" })} className="text-[#002fa7] hover:underline">{params.locality}</Link><ChevronRight size={14} aria-hidden="true" /></>}
        <span>{titleCategory}</span>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[32px] font-semibold leading-10 tracking-[-0.0341em] md:text-[44px] md:leading-[52px]">{resultTitle}</h1>
          <p className="flex flex-wrap items-center gap-x-2.5 text-[16px] leading-6"><span className="font-semibold">{resultCount.toLocaleString()} {resultCount === 1 ? "result" : "results"}</span>{(selectedCategory || params?.q) && titleArea && <span className="text-[#4a4c55]">for {titleCategory.toLowerCase()} in {titleArea}</span>}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-4">
      <div className="flex min-w-0 max-w-full items-center gap-2 overflow-x-auto py-1 [scrollbar-width:none]">
        <FilterDialog count={activeFilters.length} footer={
          <div className="flex items-center justify-between gap-3">
            {activeFilters.length > 0 ? <Link href={urlWith(navigationParams, clearAll)} className="font-display text-[14px] font-medium text-[#002fa7] underline-offset-2 hover:underline">Clear all</Link> : <span className="text-[14px] text-[#6e7079]">No filters yet</span>}
            <Button type="primary" size="m" htmlType="submit" form="filters-form" icon={<SlidersHorizontal size={16} aria-hidden="true" />}>Show {resultCount.toLocaleString()} {resultCount === 1 ? "result" : "results"}</Button>
          </div>
        }>
          <form id="filters-form" action="/directory" method="get" className="flex flex-col gap-3">
            {params?.q && <input type="hidden" name="q" value={params.q} />}<input type="hidden" name="city" value={cityName || ""} />
            {hasCoordinates && <><input type="hidden" name="lat" value={params.lat} /><input type="hidden" name="lng" value={params.lng} /><input type="hidden" name="radiusMeters" value={radiusMeters} /></>}
            {params?.state && <input type="hidden" name="state" value={params.state} />}

            <Section title="Show only">
          <Option name="openNow" value="true" defaultChecked={params?.openNow === "true"}>Open now</Option>
          <Option name="verified" value="true" defaultChecked={params?.verified === "true"}><span>Verified businesses{facetCounts.verified ? <span className="text-[#6e7079]"> ({facetCounts.verified})</span> : null}</span></Option>
          {(facetCounts.withPhotos > 0 || params?.hasPhotos) && <Option name="hasPhotos" value="true" defaultChecked={params?.hasPhotos === "true"}><span>Has photos <span className="text-[#6e7079]">({facetCounts.withPhotos})</span></span></Option>}
          {(facetCounts.withWebsite > 0 || params?.hasWebsite) && <Option name="hasWebsite" value="true" defaultChecked={params?.hasWebsite === "true"}><span>Has a website <span className="text-[#6e7079]">({facetCounts.withWebsite})</span></span></Option>}
            </Section>

            {(facetCounts.rated4 > 0 || params?.rating) && (
              <Section title="Customer rating">
            <Option type="radio" name="rating" value="" defaultChecked={!params?.rating}>Any rating</Option>
            <Option type="radio" name="rating" value="4" defaultChecked={params?.rating === "4"}><span>4.0 &amp; up <span className="text-[#6e7079]">({facetCounts.rated4})</span></span></Option>
            {facetCounts.rated45 > 0 && <Option type="radio" name="rating" value="4.5" defaultChecked={params?.rating === "4.5"}><span>4.5 &amp; up <span className="text-[#6e7079]">({facetCounts.rated45})</span></span></Option>}
            <p className="pt-1 text-[13px] leading-[18px] text-[#6e7079]">Businesses without reviews appear only under “Any rating”.</p>
              </Section>
            )}

            <Section title="Area"><AreaPicker options={localityOptions} selected={params?.locality || ""} /></Section>

            <Section title="Category">
          <select name="category" defaultValue={categorySlug || ""} aria-label="Category" className={controlClass}><option value="">All categories</option>{categoryItems.map(item => <option key={item._id || item.slug} value={item.slug}>{item.name}</option>)}</select>
            </Section>

            {amenityOptions.length > 0 && (
              <Section title="Amenities & features">
            {amenityOptions.map(item => <Option key={item.name} name="amenity" value={item.name} defaultChecked={selectedAmenities.includes(item.name)}><span>{item.name}{item.count ? <span className="text-[#6e7079]"> ({item.count})</span> : null}</span></Option>)}
              </Section>
            )}

            <Section title="Distance">
          {hasCoordinates
            ? <select name="radiusMeters" defaultValue={radiusMeters} aria-label="Distance" className={controlClass}><option value="1000">Within 1 km</option><option value="5000">Within 5 km</option><option value="10000">Within 10 km</option><option value="25000">Within 25 km</option><option value="50000">Within 50 km</option></select>
            : <div className="flex flex-col items-start gap-2 rounded-[10px] bg-[#f7f7f4] p-3"><p className="text-[14px] leading-5 text-[#4a4c55]">Show what’s close to you. Distance needs your location.</p><UseMyLocationButton category={categorySlug} searchTerm={params?.q} /></div>}
            </Section>

            <input type="hidden" name="sort" value={params?.sort || "relevance"} /><input type="hidden" name="limit" value={limit} /><input type="hidden" name="view" value={view} />
          </form>
        </FilterDialog>
        <QuickChip href={urlWith(navigationParams, { openNow: params?.openNow === "true" ? "" : "true", page: "" })} active={params?.openNow === "true"}>Open now</QuickChip>
        <QuickChip href={urlWith(navigationParams, { verified: params?.verified === "true" ? "" : "true", page: "" })} active={params?.verified === "true"}>Verified</QuickChip>
        {(facetCounts.withPhotos > 0 || params?.hasPhotos) && <QuickChip href={urlWith(navigationParams, { hasPhotos: params?.hasPhotos === "true" ? "" : "true", page: "" })} active={params?.hasPhotos === "true"}>Has photos</QuickChip>}
      </div>
        <div className="flex items-center gap-3">
          <div className="hidden gap-1 rounded-[12px] border border-[#dcdbd5] bg-white p-1 sm:flex" role="group" aria-label="View">
            {views.map(([id, label, Icon]) => <Link key={id} href={urlWith(queryWithoutPage, { view: id })} aria-current={view === id ? "page" : undefined} className={cx("inline-flex h-10 items-center gap-1.5 rounded-[8px] px-3 font-display text-[13px] font-medium", view === id ? "bg-[#002fa7] text-white" : "text-[#101115] hover:bg-[#f1f1ee]")}><Icon size={18} aria-hidden="true" />{label}</Link>)}
          </div>
          <form action="/directory" method="get" className="relative flex items-center">
            {Object.entries(queryWithoutPage).filter(([key, value]) => value && key !== "sort" && key !== "view").map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
            <input type="hidden" name="view" value={view} />
            <label className="sr-only" htmlFor="sort">Sort by</label>
            <select id="sort" name="sort" defaultValue={params?.sort || "relevance"} style={{ height: 52, fontSize: 14, paddingRight: 40, appearance: "none", WebkitAppearance: "none" }} className={cx(controlClass, "w-[166px] !text-[14px]")}><option value="relevance">Relevance</option><option value="rating">Rating</option><option value="newest">Newest</option>{hasCoordinates && <option value="distance">Distance</option>}</select><ChevronDown size={18} aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4a4c55]" />
            <button className="sr-only">Sort results</button>
          </form>
        </div>
      </div>
      {hasCoordinates && <p className="flex items-start gap-2 rounded-[10px] bg-[#e6ebf7] px-3.5 py-2.5 text-[14px] leading-5 text-[#002fa7]"><LocateFixed size={18} className="mt-px shrink-0" aria-hidden="true" />{businesses.length === 0 ? `No businesses found within ${usedRadius / 1000} km of you. Try another category, or search by city.` : widened ? `Nothing within ${radiusMeters / 1000} km, so we’re showing businesses within ${usedRadius / 1000} km of you.` : `Showing businesses within ${usedRadius / 1000} km of you, nearest first.`}<Link href={urlWith(navigationParams, { lat: "", lng: "", radiusMeters: "", sort: "", page: "" })} className="ml-1 shrink-0 font-medium underline">Clear</Link></p>}
      {(activeFilters.length > 0 || (hasCoordinates && !params?.openNow)) && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map(([label, change]) => <FilterChip key={label} label={label} href={urlWith(navigationParams, { ...change, page: "" })} />)}
          {activeFilters.length > 0 && <Button type="ghost" size="s" href={urlWith(navigationParams, clearAll)}>Clear all</Button>}
        </div>
      )}
    </section>

    {/* Body */}
    <div className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] items-start gap-8 px-4 pb-20 pt-3 md:px-8 lg:px-[72px]">

      <section aria-label="Business results" className="min-w-0">
        {view === "map" ? (
          <DirectoryMapView businesses={businesses} emptyState={<EmptyState category={titleCategory} city={cityName} />} />
        ) : businesses.length ? (
          <div className={view === "list" ? "flex flex-col gap-6" : "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"}>{businesses.map(b => <BusinessCard key={b._id || b.slug || b.name} business={b} layout={view} dense />)}</div>
        ) : <EmptyState category={titleCategory} city={cityName} />}

        {businesses.length > 0 && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-[14px] leading-5 text-[#4a4c55]">Showing {(page - 1) * limit + 1}–{shown} of {resultCount.toLocaleString()}</p>
            <div className="flex gap-3">
              {nearbyPagination.hasPreviousPage && <Button type="secondary" href={pageHref(page - 1)}>Previous</Button>}
              {nearbyPagination.hasNextPage && <Button type="secondary" href={pageHref(page + 1)} trailingIcon={<ChevronRight size={18} aria-hidden="true" />}>Load more</Button>}
            </div>
          </div>
        )}
      </section>
    </div>
    {isLanding && landingItems.length > 0 && (() => {
      const categoryLabel = landingItems[0]?.category?.name || (categoryItems.find((item) => item.slug === categorySlug)?.name) || "Businesses";
      const paragraphs = categoryCityParagraphs({ cityName: displayCity(cityName), categoryName: categoryLabel, total: nearbyPagination.totalItems || landingItems.length, businesses: landingItems });
      return paragraphs.length ? (
        <section aria-labelledby="landing-about" className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 pb-14 md:px-8 lg:px-[72px]">
          <h2 id="landing-about" className="text-[24px] font-semibold leading-8 tracking-[-0.0208em]">About {categoryLabel.toLowerCase()} in {displayCity(cityName)}</h2>
          <div className="flex max-w-[860px] flex-col gap-3">{paragraphs.map((text) => <p key={text} className="text-[16px] leading-7 text-[#2d2f36]">{text}</p>)}</div>
        </section>
      ) : null;
    })()}
    <SiteFooter />
  </main>;
}

function EmptyState({ category, city }) {
  return (
    <div className="grid min-h-[360px] place-items-center rounded-[16px] border border-[#dcdbd5] bg-white px-5 py-12 text-center">
      <div className="flex max-w-[420px] flex-col items-center gap-3">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-[#f1f1ee] text-[#4a4c55]"><SearchX size={24} aria-hidden="true" /></span>
        <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.02em]">No {String(category).toLowerCase()} found{city ? ` in ${city}` : ""}</h2>
        <p className="text-[16px] leading-6 text-[#4a4c55]">Try removing a filter, widening the area, or exploring a nearby neighbourhood.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3"><Button type="secondary" href="/directory">Clear all filters</Button><Button type="primary" href="/add-business">Add your business</Button></div>
      </div>
    </div>
  );
}
