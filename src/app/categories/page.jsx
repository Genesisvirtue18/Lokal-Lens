import Link from "next/link";
import { Search } from "lucide-react";
import { getCategories, getBusinessCities } from "@/lib/api";
import SiteHeader from "@/components/ds/SiteHeader";
import SiteFooter from "@/components/ds/SiteFooter";
import { Eyebrow, cx, fieldClass, labelClass } from "@/components/ds";

export const metadata = { title: "All categories | Lokal Lens", description: "Browse every kind of local business by category." };

const ICON_RULES = [
  [/restaurant|cafe|café|food|bakery|dining/i, "restaurant"],
  [/health|clinic|medical|hospital|dent|doctor/i, "medical_services"],
  [/beauty|salon|spa|wellness|fitness|gym/i, "spa"],
  [/educat|school|coach|tutor|class/i, "school"],
  [/automotive|vehicle|garage|bike|\bcars?\b/i, "directions_car"],
  [/home|repair|electric|plumb|clean|construct/i, "home_repair_service"],
  [/shop|retail|store|fashion|cloth/i, "shopping_bag"],
  [/professional|legal|law|consult|finance|account|business/i, "business_center"],
  [/hotel|travel|stay|resort/i, "hotel"],
  [/real estate|property|realty/i, "apartment"],
];
const iconFor = (name) => ICON_RULES.find(([pattern]) => pattern.test(name || ""))?.[1] || "storefront";
const idOf = (value) => String(typeof value === "object" ? value?._id || value?.id || "" : value || "");

export default async function CategoriesPage({ searchParams }) {
  const params = await searchParams;
  const search = String(params?.search || "").trim();
  const [{ items = [] }, { items: cities = [] }] = await Promise.all([getCategories({ limit: 100 }), getBusinessCities()]);
  const rootCategories = items.filter((item) => !item.parentCategory);
  const groups = rootCategories.map((category) => ({
    ...category,
    children: items.filter((item) => idOf(item.parentCategory) === idOf(category)).filter((item) => !search || `${item.name} ${item.description || ""}`.toLowerCase().includes(search.toLowerCase())),
  })).filter((category) => !search || `${category.name} ${category.description || ""}`.toLowerCase().includes(search.toLowerCase()) || category.children.length > 0);
  const cityNames = [...new Set(cities.map((item) => (typeof item === "string" ? item : item.name)).filter(Boolean))];
  const requestedCity = String(params?.city || "");
  const cityName = cityNames.find((name) => name.toLowerCase() === requestedCity.toLowerCase()) || "";
  const cityQuery = cityName ? `&city=${encodeURIComponent(cityName)}` : "";
  const link = (category) => `/directory?category=${encodeURIComponent(category.slug || category.name)}${cityQuery}`;

  return (
    <main className="min-h-screen bg-[#f1f1ee] text-[#101115]">
      <SiteHeader variant="desktop" active="categories" cities={cityNames} city={cityName} cityBasePath="/categories" />
      <section className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 pb-6 pt-10 md:px-8 lg:px-[72px] lg:pt-14">
        <Eyebrow>All categories</Eyebrow>
        <h1 className="text-[32px] font-semibold leading-10 tracking-[-0.0341em] md:text-[44px] md:leading-[52px]">Every kind of local business</h1>
        <p className="font-serif text-[18px] leading-7 text-[#4a4c55] md:text-[20px]">Pick a category to see businesses{cityName ? ` in ${cityName}` : " across all cities"}. Change the city at the top.</p>
        <form action="/categories" method="get" className="mt-3 flex max-w-[480px] flex-col gap-1.5">
          {cityName && <input type="hidden" name="city" value={cityName} />}
          <label htmlFor="category-search" className={labelClass}>Filter categories</label>
          <span className="relative block"><Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a4c55]" aria-hidden="true" /><input id="category-search" name="search" defaultValue={search} placeholder="e.g. tailor, dentist, car wash" className={cx(fieldClass, "pl-11")} /></span>
        </form>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 pb-20 pt-6 md:px-8 lg:px-[72px]">
        <div className="gap-6 md:columns-2">
          {groups.map((category) => (
            <article key={idOf(category)} className="mb-6 flex break-inside-avoid flex-col gap-4 rounded-[16px] border border-[#dcdbd5] bg-white p-6">
              <Link href={link(category)} className="flex items-center gap-3 hover:text-[#002fa7]">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[#f1f1ee] text-[#002fa7]"><span className="material-symbols-outlined text-[22px]" aria-hidden="true">{iconFor(category.name)}</span></span>
                <span className="font-display text-[18px] font-semibold leading-[26px] tracking-[-0.0111em]">{category.name}</span>
              </Link>
              <div className="flex flex-wrap gap-2">
                {category.children.map((child) => <Link key={idOf(child)} href={link(child)} className="inline-flex h-10 items-center rounded-full border border-[#dcdbd5] bg-white px-3.5 font-display text-[14px] font-medium transition-colors hover:border-[#002fa7] hover:text-[#002fa7]">{child.name}</Link>)}
                {!category.children.length && <Link href={link(category)} className="inline-flex h-10 items-center rounded-full border border-[#dcdbd5] bg-white px-3.5 font-display text-[14px] font-medium transition-colors hover:border-[#002fa7] hover:text-[#002fa7]">Browse {category.name}</Link>}
              </div>
            </article>
          ))}
        </div>
        {!groups.length && (
          <div className="rounded-[16px] border border-[#dcdbd5] bg-white px-5 py-14 text-center"><p className="text-[16px] font-semibold">No categories match “{search}”</p><Link href="/categories" className="mt-3 inline-block text-[14px] font-medium text-[#002fa7]">Clear search</Link></div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
