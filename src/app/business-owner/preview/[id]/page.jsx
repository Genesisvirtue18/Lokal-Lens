"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BusinessProfileView from "@/components/BusinessProfileView";
import SiteHeader from "@/components/ds/SiteHeader";
import { Button } from "@/components/ds";
import { loadBusinessFormData, loadOwnerBusiness } from "@/dashboard/api";

// The owner's preview: the same profile page customers see, loaded with the owner's login so it works before approval.
export default function OwnerPreviewPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [state, setState] = useState({ loading: true, business: null, error: "" });

  useEffect(() => {
    let token = "";
    try { token = localStorage.getItem("directflow_access_token") || ""; } catch { /* storage unavailable */ }
    if (!token) { router.replace(`/login?next=/business-owner/preview/${id}`); return; }
    (async () => {
      try {
        const [item, { categories = [] }] = await Promise.all([loadOwnerBusiness(id), loadBusinessFormData().catch(() => ({ categories: [] }))]);
        const flat = categories.flatMap((root) => [root, ...(root.children || [])]);
        const category = flat.find((entry) => String(entry._id) === String(item.category?._id || item.category));
        setState({ loading: false, error: "", business: { ...item, category: category ? { _id: category._id, name: category.name, slug: category.slug } : item.category, verificationStatus: item.verificationStatus } });
      } catch (reason) { setState({ loading: false, business: null, error: reason instanceof Error ? reason.message : "Unable to load this listing." }); }
    })();
  }, [id, router]);

  if (state.loading) return <main className="grid min-h-screen place-items-center bg-[#f1f1ee]"><p className="text-[16px] text-[#4a4c55]">Loading your preview…</p></main>;
  if (!state.business) return (
    <main className="min-h-screen bg-[#f1f1ee]"><SiteHeader variant="compact" /><div className="mx-auto flex max-w-[480px] flex-col items-center gap-3 px-4 py-24 text-center"><h1 className="text-[28px] font-semibold">We couldn’t open the preview</h1><p className="text-[16px] text-[#4a4c55]">{state.error}</p><Button type="primary" href="/business-owner">Back to dashboard</Button></div></main>
  );
  return <BusinessProfileView business={state.business} related={[]} preview />;
}
