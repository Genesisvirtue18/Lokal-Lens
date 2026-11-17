import SiteHeader from "@/components/ds/SiteHeader";

// Kept for existing pages (categories, saved): renders the Figma header.
export default function SupportingHeader({ active = "", city = "", cities = [] }) {
  const cityBase = active === "categories" ? "/categories" : "/directory";
  return <SiteHeader variant="desktop" active={active === "categories" ? "categories" : active} cities={cities} city={city} cityBasePath={cityBase} />;
}
