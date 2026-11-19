import { notFound, permanentRedirect } from "next/navigation";
import { getCityCategories } from "@/lib/api";
import { categoryListingPath } from "@/lib/directory-data";
import { groupByCity } from "@/lib/seo";

export const revalidate = 600;
export const metadata = { robots: { index: false, follow: true } };

// People (and other sites) type /ghaziabad/healthcare. The real category page lives at /ghaziabad/healthcare/nct-<id>, so send them there
// with a permanent redirect, which also hands the old URL's ranking to the real one. Unknown pairs are a real 404.
export default async function CityCategoryRedirect({ params }) {
  const { city: citySlug, term } = await params;
  const { items = [] } = await getCityCategories();
  const city = groupByCity(items).get(String(citySlug).toLowerCase());
  const wanted = decodeURIComponent(String(term)).toLowerCase();
  const match = city?.categories.find((item) => String(item.categorySlug).toLowerCase() === wanted);
  if (!city || !match) notFound();
  permanentRedirect(categoryListingPath(city.name, { slug: match.categorySlug, _id: match.categoryId }));
}
