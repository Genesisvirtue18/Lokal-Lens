import { cookies } from "next/headers";
import { getBusinessCities } from "@/lib/api";
import SiteHeader from "@/components/ds/SiteHeader";
import AskLokal from "@/components/AskLokal";

export const metadata = { title: "Ask Lokal | Lokal Lens", description: "Ask for a local business in plain words and get matching listings.", alternates: { canonical: "/ask" }, robots: { index: false, follow: true } };

export default async function AskPage({ searchParams }) {
  const params = (await searchParams) || {};
  const cookieStore = await cookies();
  const { items: cityItems = [] } = await getBusinessCities();
  const cities = cityItems.map((city) => (typeof city === "string" ? city : city.name)).filter(Boolean);
  const requested = typeof params.city === "string" ? params.city : decodeURIComponent(cookieStore.get("lokal_city")?.value || "");
  const city = cities.find((name) => name.toLowerCase() === requested.toLowerCase()) || "";
  return (
    <main className="min-h-screen bg-[#f1f1ee] text-[#101115]">
      <SiteHeader variant="desktop" active="ask" cities={cityItems} city={city} cityBasePath="/ask" />
      <AskLokal city={city} initialQuestion={typeof params.q === "string" ? params.q : ""} />
    </main>
  );
}
