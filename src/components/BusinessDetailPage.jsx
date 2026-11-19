import { notFound } from "next/navigation";
import { getBusiness, getBusinesses } from "@/lib/api";
import { toDirectoryBusiness } from "@/lib/directory-data";
import BusinessProfileView from "@/components/BusinessProfileView";

export default async function BusinessDetailPage({ params }) {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) notFound();


  const businessId = String(business._id || business.id || "");
  const categoryName = business.category?.name || business.keywords?.[0] || "Business";
  const categorySlug = business.category?.slug || categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const { items: relatedItems = [] } = await getBusinesses({ category: categorySlug, city: business.address?.city, limit: 5, sort: "rating" });
  const related = relatedItems.filter((item) => String(item._id || item.id) !== businessId).slice(0, 4).map(toDirectoryBusiness);
  return <BusinessProfileView business={business} related={related} />;
}
