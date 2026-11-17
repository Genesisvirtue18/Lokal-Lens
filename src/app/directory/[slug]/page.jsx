import Link from "next/link";
import { Store } from "lucide-react";
import { getBusiness, getBusinesses } from "@/lib/api";
import { toDirectoryBusiness } from "@/lib/directory-data";
import SiteHeader from "@/components/ds/SiteHeader";
import SiteFooter from "@/components/ds/SiteFooter";
import BusinessProfileView from "@/components/BusinessProfileView";
import { Button } from "@/components/ds";

export default async function BusinessDetailPage({ params }) {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) return (
    <main className="min-h-screen bg-[#f1f1ee] text-[#101115]">
      <SiteHeader variant="compact" active="explore" cities={[]} city="" cityBasePath="/directory" />
      <div className="mx-auto grid max-w-[640px] place-items-center px-4 py-24 text-center">
        <div className="flex flex-col items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-[#002fa7]"><Store size={24} aria-hidden="true" /></span>
          <h1 className="text-[32px] font-semibold leading-10 tracking-[-0.02em]">This business profile isn’t available</h1>
          <p className="text-[16px] leading-6 text-[#4a4c55]">It may have been removed by the owner or merged with another listing.</p>
          <div className="mt-3 flex flex-wrap justify-center gap-3"><Button type="secondary" href="/directory">Back to results</Button><Button type="primary" href="/directory">Search similar businesses</Button></div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );

  const businessId = String(business._id || business.id || "");
  const categoryName = business.category?.name || business.keywords?.[0] || "Business";
  const categorySlug = business.category?.slug || categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const { items: relatedItems = [] } = await getBusinesses({ category: categorySlug, city: business.address?.city, limit: 5, sort: "rating" });
  const related = relatedItems.filter((item) => String(item._id || item.id) !== businessId).slice(0, 4).map(toDirectoryBusiness);
  return <BusinessProfileView business={business} related={related} />;
}
