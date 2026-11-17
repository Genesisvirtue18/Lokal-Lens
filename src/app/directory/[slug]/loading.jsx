import SiteHeader from "@/components/ds/SiteHeader";

// Business page loading state: gallery and contact panel placeholders in their real positions.
export default function ProfileLoading() {
  return (
    <main className="min-h-screen bg-[#f1f1ee]" aria-busy="true" aria-label="Loading business">
      <SiteHeader variant="compact" active="explore" />
      <div className="mx-auto max-w-[1440px] px-4 pt-5 md:px-8 lg:px-[72px]">
        <div className="h-11 w-40 animate-pulse rounded bg-[#e4e3de]" />
        <div className="mt-4 grid gap-3 lg:h-[460px] lg:grid-cols-[minmax(0,1fr)_480px]"><div className="h-[260px] animate-pulse rounded-[16px] bg-[#e4e3de] lg:h-full" /><div className="hidden grid-cols-2 grid-rows-2 gap-3 lg:grid">{[0, 1, 2, 3].map((i) => <div key={i} className="animate-pulse rounded-[16px] bg-[#e4e3de]" />)}</div></div>
        <div className="mt-9 grid gap-12 lg:grid-cols-[minmax(0,1fr)_400px]"><div className="flex flex-col gap-4"><div className="h-4 w-56 animate-pulse rounded bg-[#e4e3de]" /><div className="h-12 w-3/4 animate-pulse rounded bg-[#e4e3de]" /><div className="h-5 w-1/2 animate-pulse rounded bg-[#ecebe7]" /></div><div className="hidden h-[420px] animate-pulse rounded-[20px] bg-white lg:block" /></div>
      </div>
    </main>
  );
}
