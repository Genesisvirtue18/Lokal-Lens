import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Phone, Star, Store } from "lucide-react";
import BusinessProfileActions from "@/components/BusinessProfileActions";
import { businessDetailPath } from "@/lib/directory-data";
import { openStatus } from "@/lib/open-status";

const PRICE_LEVELS = { budget: 1, moderate: 2, expensive: 3, luxury: 4 };
const PRICE_NAMES = { budget: "Budget", moderate: "Moderate", expensive: "Premium", luxury: "Luxury" };

function usableImage(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    const blocked = url.hostname === "business.google.com" && url.pathname.startsWith("/bulkmedia/");
    return ["http:", "https:"].includes(url.protocol) && url.hostname !== "example.com" && !blocked ? value : null;
  } catch {
    return null;
  }
}

// Listing card used on the home page and in search results. layout="list" places the photo beside the details.
export default function ListingCard({ business, layout = "grid", sponsored }) {
  const list = layout === "list";
  const href = businessDetailPath(business);
  const image = usableImage(business.image || business.images?.[0] || business.logo);
  const categoryName = typeof business.category === "string" ? business.category : business.category?.name || "Business";
  const city = business.address?.city || business.city || "";
  const area = business.area || business.address?.locality || city;
  const place = [business.address?.locality || (area !== city ? area : ""), city].filter(Boolean).join(", ") || area;
  const rating = Number(business.averageRating) || 0;
  const reviews = Number(business.reviewCount) || 0;
  const verified = Boolean(business.verified || business.verificationStatus === "verified");
  const isSponsored = sponsored ?? Boolean(business.isFeatured);
  const services = (business.services || []).filter(Boolean);
  const status = openStatus(business);
  const priceLevel = PRICE_LEVELS[business.priceRange] || 0;
  const id = String(business._id || business.id || "");
  const statusClass = status.tone === "open" ? "text-[#1f7a3a]" : status.tone === "closed" ? "text-[#b1452f]" : "text-[#4a4c55]";
  const dotClass = status.tone === "open" ? "bg-[#1f9d4a]" : status.tone === "closed" ? "bg-[#d4553f]" : "bg-[#9a9ca3]";
  const saved = { id, name: business.name, href, category: categoryName, area, city, address: business.address || {}, image: image || "", description: business.description || "", hasGooglePlaceId: business.hasGooglePlaceId, verified, phone: business.phone || "", isFeatured: isSponsored };

  return (
    <article className={`group relative flex flex-col rounded-xl border bg-white p-2.5 shadow-[0_4px_16px_rgba(15,18,20,.05)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(15,18,20,.10)] ${list ? "sm:grid sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-3" : ""} ${business._selected ? "border-[#002fa7] ring-2 ring-[#002fa7]/30" : "border-[#e4e3de]"}`}>
      <div style={{ aspectRatio: list ? "4 / 3" : "16 / 10" }} className={`relative min-h-[150px] overflow-hidden rounded-xl bg-[#e6e6e1] ${list ? "sm:!aspect-auto sm:min-h-[180px]" : ""}`}>
        <Link href={href} aria-label={`View ${business.name}`} className="absolute inset-0">
          {image ? (
            <Image src={image} unoptimized alt={business.name} fill sizes={list ? "240px" : "(max-width: 640px) 90vw, (max-width: 1280px) 45vw, 30vw"} className="object-cover transition duration-500 group-hover:scale-[1.03]" />
          ) : (
            <div className="grid h-full place-items-center text-[#4a4c55]"><Store size={36} /></div>
          )}
        </Link>
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          {rating > 0 && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 text-[13px] font-semibold shadow-sm">
              <Star size={14} className="fill-[#f5a623] text-[#f5a623]" />
              {rating.toFixed(1)}
              {reviews > 0 && <span className="font-normal text-[#4a4c55]">({reviews})</span>}
            </span>
          )}
          {isSponsored && <span className="rounded-xl bg-[#101115]/80 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">Sponsored</span>}
        </div>
        <div className="absolute right-3 top-3"><BusinessProfileActions compact business={saved} /></div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-1.5 pb-0.5 pt-3">
        <h3 className="flex items-center gap-1.5 text-[17px] font-bold leading-6">
          <Link href={href} className="min-w-0 truncate hover:text-[#002fa7]">{business.name}</Link>
          {verified && <BadgeCheck size={18} className="shrink-0 text-[#1a73e8]" aria-label="Verified business" />}
        </h3>
        <p className="mt-0.5 truncate text-[14px] text-[#4a4c55]">{place}</p>

        <div className="mt-2 flex h-5 items-center justify-between gap-3 text-[13px]">
          <span className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap">
            <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
            <span className={`font-semibold ${statusClass}`}>{status.label}</span>
            {status.detail && <span className="truncate text-[#4a4c55]">· {status.detail}</span>}
          </span>
          {priceLevel > 0 && (
            <span className="shrink-0 font-medium" title={`${PRICE_NAMES[business.priceRange]} price range`} aria-label={`${PRICE_NAMES[business.priceRange]} price range`}>
              <span className="text-[#101115]">{"₹".repeat(priceLevel)}</span>
              <span className="text-[#cfcec8]">{"₹".repeat(4 - priceLevel)}</span>
            </span>
          )}
        </div>

        <div className="mt-2 flex h-6 flex-nowrap items-center gap-1.5 overflow-hidden" title={[categoryName, ...services].join(", ")}>
          <span className="max-w-[60%] shrink-0 truncate rounded-xl bg-[#e8eefc] px-2 py-1 text-[12px] font-semibold leading-none text-[#1746b5]">{categoryName}</span>
          {services[0] && <span className="min-w-0 truncate rounded-xl bg-[#f3f3f0] px-2 py-1 text-[12px] leading-none text-[#4a4c55]">{services[0]}</span>}
          {services.length > 1 && <span className="shrink-0 rounded-xl bg-[#f3f3f0] px-2 py-1 text-[12px] leading-none text-[#4a4c55]">+{services.length - 1}</span>}
        </div>

        <div className="mt-auto flex items-center gap-2.5 pt-4">
          <Link href={href} className="flex h-10 flex-1 items-center justify-center rounded-xl bg-[#101115] text-[13px] font-semibold text-white transition hover:bg-[#002fa7]">View details</Link>
          {business.phone && (
            <a href={`tel:${business.phone}`} aria-label={`Call ${business.name}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#cfcec8] text-[#101115] transition hover:border-[#002fa7] hover:text-[#002fa7]"><Phone size={16} /></a>
          )}
        </div>
      </div>
    </article>
  );
}
