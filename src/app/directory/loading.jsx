import SiteHeader from "@/components/ds/SiteHeader";

// Directory loading state: skeleton cards at the same size as real cards so the page doesn't jump.
export default function DirectoryLoading() {
  return (
    <main className="min-h-screen bg-[#f1f1ee]" aria-busy="true" aria-label="Loading results">
      <SiteHeader variant="compact" active="explore" />
      <section className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 pb-5 pt-7 md:px-8 lg:px-[72px]">
        <div className="h-5 w-48 animate-pulse rounded bg-[#e4e3de]" />
        <div className="h-12 w-[min(520px,90%)] animate-pulse rounded bg-[#e4e3de]" />
        <div className="h-5 w-28 animate-pulse rounded bg-[#e4e3de]" />
      </section>
      <div className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] items-start gap-8 px-4 pb-20 pt-3 md:px-8 lg:grid-cols-[264px_minmax(0,1fr)] lg:px-12 xl:px-[72px]">
        <div className="hidden h-[640px] animate-pulse rounded-[16px] border border-[#dcdbd5] bg-white lg:block" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="overflow-hidden rounded-[16px] border border-[#dcdbd5] bg-white">
              <div className="h-[208px] animate-pulse bg-[#e4e3de]" />
              <div className="flex flex-col gap-3 p-5">
                <div className="h-3 w-1/2 animate-pulse rounded bg-[#e4e3de]" />
                <div className="h-5 w-4/5 animate-pulse rounded bg-[#e4e3de]" />
                <div className="h-4 w-full animate-pulse rounded bg-[#ecebe7]" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-[#ecebe7]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
