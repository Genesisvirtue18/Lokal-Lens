import { getBusinessCities } from "@/lib/api";
import { getCategoryTree } from "@/lib/api";
import SiteHeader from "@/components/ds/SiteHeader";
import SiteFooter from "@/components/ds/SiteFooter";
import QuoteForm from "@/components/QuoteForm";

export const metadata = {
  title: "Get Quotes from Local Businesses | Lokal Lens",
  description: "Tell us what you need once and send it to up to five local businesses you choose.",
  alternates: { canonical: "/quote" },
};

export default async function QuotePage({ searchParams }) {
  const params = (await searchParams) || {};
  const [{ items: categories = [] }, { items: cities = [] }] = await Promise.all([getCategoryTree(), getBusinessCities()]);
  const value = (name) => (typeof params[name] === "string" ? params[name] : "");
  const wantedCity = value("city").trim().toLowerCase();
  const names = cities.map((item) => (typeof item === "string" ? item : item.name));
  const city = names.find((name) => name.toLowerCase() === wantedCity) || value("city").slice(0, 120);
  return (
    <main className="min-h-screen bg-[#f1f1ee] text-[#101115]">
      <SiteHeader variant="compact" cities={cities} />
      <section className="mx-auto flex max-w-[760px] flex-col gap-5 px-4 py-8 md:py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-[34px] md:leading-[42px]">Get quotes</h1>
          <p className="text-[16px] leading-6 text-[#4a4c55]">Write what you need once. Choose up to five businesses and they contact you. Free to use.</p>
        </div>
        <QuoteForm key={`${value("category")}|${city}`} categories={categories} cities={cities} defaultCategory={value("category")} defaultCity={city} />
      </section>
      <SiteFooter />
    </main>
  );
}
