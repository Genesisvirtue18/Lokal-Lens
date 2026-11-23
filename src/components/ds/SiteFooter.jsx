import Link from "next/link";
import { BarContainer, Logo } from "@/components/ds";

// Footer: Figma "Brand, header & footer / Footer". White bar, 1px top border, 56px top padding, columns 180px wide with a 64px gap.
const columns = [
  { title: "Explore", links: [["Explore businesses", "/directory"], ["All categories", "/categories"], ["Browse by area", "/directory"], ["Saved businesses", "/saved"], ["Offers near you", "/offers"], ["Ask Lokal", "/ask"]] },
  { title: "For businesses", links: [["Add your business", "/add-business"], ["Claim a listing", "/login"], ["Owner dashboard", "/business-owner"]] },
  { title: "Lokal Lens", links: [["How it works", "/#how-it-works"], ["What “Verified” means", "/terms#verified"], ["Report a listing", "/terms#reporting"], ["Terms & contact", "/terms#contact"]] },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-[#dcdbd5] bg-white">
      <BarContainer className="flex flex-col gap-10 pb-8 pt-10 md:pt-14">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10 xl:gap-16">
          <div className="flex w-full max-w-[360px] flex-col gap-3 lg:w-[300px] lg:shrink-0 xl:w-[360px]">
            <Link href="/" aria-label="Lokal Lens home" className="w-fit"><Logo /></Link>
            <p className="text-[14px] leading-5 text-[#4a4c55]">A directory of local businesses across India — find them, understand what they offer, and contact them directly.</p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:flex lg:min-w-0 lg:flex-1 lg:gap-8 xl:ml-16 xl:gap-16">
            {columns.map((column) => (
              <nav key={column.title} aria-label={column.title} className="flex flex-col gap-1 lg:min-w-0 lg:flex-1 xl:w-[180px] xl:flex-none">
                <p className="font-eyebrow text-[#6e7079]">{column.title}</p>
                {column.links.map(([label, href]) => (
                  <Link key={label} href={href} className="flex min-h-9 items-center text-[14px] leading-5 text-[#101115] hover:text-[#002fa7]">{label}</Link>
                ))}
              </nav>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 text-[14px] leading-5 text-[#6e7079] md:flex-row md:items-start md:justify-between">
          <p>© {new Date().getFullYear()} Lokal Lens · <Link href="/privacy" className="hover:text-[#002fa7]">Privacy</Link> · <Link href="/terms" className="hover:text-[#002fa7]">Terms</Link></p>
          <p>Listings are submitted by businesses and reviewed before going live.</p>
        </div>
      </BarContainer>
    </footer>
  );
}
