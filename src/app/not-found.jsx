import Link from "next/link";
import SiteHeader from "@/components/ds/SiteHeader";
import SiteFooter from "@/components/ds/SiteFooter";
import { Button } from "@/components/ds";

export const metadata = { title: "Page not found | Lokal Lens", robots: { index: false, follow: true } };

// Shown with a real 404 status, so search engines drop the address instead of keeping an empty page in their results.
export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#f1f1ee] text-[#101115]">
      <SiteHeader variant="compact" active="explore" cities={[]} city="" cityBasePath="/directory" />
      <div className="mx-auto grid max-w-[640px] place-items-center px-4 py-24 text-center">
        <div className="flex flex-col items-center gap-3">
          <p className="font-eyebrow text-[#002fa7]">404</p>
          <h1 className="text-[32px] font-semibold leading-10 tracking-[-0.02em]">We couldn’t find that page</h1>
          <p className="text-[16px] leading-6 text-[#4a4c55]">The business may have been removed, or the link has a typo. Try searching, or browse by category.</p>
          <div className="mt-3 flex flex-wrap justify-center gap-3"><Button type="primary" href="/directory">Search businesses</Button><Button type="secondary" href="/categories">Browse categories</Button></div>
          <p className="mt-2 text-[14px] text-[#6e7079]"><Link href="/" className="text-[#002fa7] hover:underline">Go to the home page</Link></p>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
