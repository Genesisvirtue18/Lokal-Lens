import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, ImageIcon, Phone, Star } from "lucide-react";
import BusinessProfileActions from "@/components/BusinessProfileActions";
import { Badge, Button, Rating, cx } from "@/components/ds";
import { businessDetailPath } from "@/lib/directory-data";
import { openStatus } from "@/lib/open-status";

// Business card: Figma "Components / Business card" (Layout = Grid | List | Compact).
//  Grid     photo 208px tall, 20px body padding, 16px radius, 1px #dcdbd5 border
//  List     photo 280px wide on the left, 24px body padding
//  Compact  112px photo + title/rating, used inside the home page gallery wall

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

export function cardData(business, sponsoredProp) {
  const categoryName = typeof business.category === "string" ? business.category : business.category?.name || "Business";
  const city = business.address?.city || business.city || "";
  const locality = business.address?.locality || (business.area && business.area !== city ? business.area : "");
  const status = openStatus(business);
  const minutesLeft = status.minutesLeft;
  let open = null;
  if (status.tone === "open") open = minutesLeft !== undefined && minutesLeft <= 60 ? { tone: "closing", text: `Closes in ${minutesLeft} min` } : { tone: "open", text: status.until ? `Open · until ${status.until}` : "Open now" };
  else if (status.tone === "closed") open = { tone: "closed", text: status.label === "Closed today" ? "Closed today" : "Closed" };
  const description = String(business.tagline || business.description || "").trim();
  return {
    href: business.href || businessDetailPath(business),
    id: String(business._id || business.id || ""),
    name: business.name,
    image: usableImage(business.image || business.images?.[0] || business.logo),
    categoryName,
    city,
    locality,
    eyebrow: [categoryName, locality || city].filter(Boolean).join(" · "),
    description,
    rating: Number(business.averageRating) || 0,
    reviews: Number(business.reviewCount) || 0,
    verified: Boolean(business.verified || business.verificationStatus === "verified"),
    sponsored: sponsoredProp ?? Boolean(business.isFeatured),
    phone: business.phone || "",
    distance: Number.isFinite(business.distanceMeters) ? (business.distanceMeters < 1000 ? `${Math.round(business.distanceMeters / 10) * 10} m away` : `${(business.distanceMeters / 1000).toFixed(1)} km away`) : "",
    open,
  };
}

function PhotoArea({ data, className, sizes, children, fit = "contain" }) {
  return (
    <div className={cx("relative overflow-hidden bg-[#f7f7f4]", className)}>
      {data.image ? (
        <Link href={data.href} aria-label={`View ${data.name}`} tabIndex={-1} className="absolute inset-0 block">
          {fit === "contain" && <Image src={data.image} alt="" fill unoptimized sizes="64px" aria-hidden="true" className="scale-125 object-cover opacity-70 blur-xl" />}
          <Image src={data.image} alt="" fill unoptimized sizes={sizes} className={fit === "contain" ? "object-contain" : "object-cover"} />
        </Link>
      ) : (
        <Link href={data.href} aria-label={`View ${data.name}`} tabIndex={-1} className="absolute inset-0 flex flex-col items-center justify-center gap-[6px] text-[#6e7079]">
          <ImageIcon size={28} aria-hidden="true" />
          <span className="font-display text-[13px] font-medium leading-[18px]">No photos yet</span>
        </Link>
      )}
      <div className="pointer-events-none absolute inset-0 flex items-start justify-between p-3">
        <div>{data.sponsored && <Badge tone="sponsored" className="pointer-events-auto">Sponsored</Badge>}</div>
        <div className="pointer-events-auto">{children}</div>
      </div>
    </div>
  );
}

function SaveButton({ data, business }) {
  return <BusinessProfileActions compact business={{ id: data.id, name: data.name, href: data.href, category: data.categoryName, area: data.locality || data.city, city: data.city, address: business.address || {}, image: data.image || "", description: data.description, hasGooglePlaceId: business.hasGooglePlaceId, verified: data.verified, phone: data.phone, isFeatured: data.sponsored }} />;
}

function Meta({ data, inline, showVerified }) {
  return (
    <div className={cx("flex gap-[10px]", inline ? "flex-row flex-wrap items-center gap-x-2.5 gap-y-1.5" : "flex-col items-start")}>
      <Rating value={data.rating} count={data.reviews} />
      {data.open && <Badge tone={data.open.tone}>{data.open.text}</Badge>}
      {showVerified && data.verified && <Badge tone="verified">Verified</Badge>}
    </div>
  );
}

function Actions({ data, className }) {
  return (
    <div className={cx("flex items-center gap-2", className)}>
      <Button type="secondary" size="s" href={data.href}>View details</Button>
      {data.phone && <Button type="ghost" size="s" href={`tel:${data.phone}`} icon={<Phone size={18} aria-hidden="true" />} aria-label={`Call ${data.name}`}>Call</Button>}
    </div>
  );
}

export default function BusinessCard({ business, layout = "grid", sponsored, className = "", selected = false }) {
  const data = cardData(business, sponsored);
  const shell = cx("overflow-hidden rounded-[16px] border bg-white", selected ? "border-[#002fa7] ring-2 ring-[#002fa7]/30" : "border-[#dcdbd5]");

  if (layout === "compact") {
    return (
      <article className={cx(shell, "flex items-center gap-0 pr-3", className)}>
        <PhotoArea data={data} className="m-[6px] h-[112px] w-[112px] shrink-0 rounded-[12px]" sizes="112px" fit="cover"><span /></PhotoArea>
        <div className="flex min-w-0 flex-1 flex-col gap-1 py-3 pl-2 pr-2">
          <p className="truncate font-eyebrow text-[#002fa7]">{data.eyebrow}</p>
          <h3 className="truncate font-display text-[16px] font-semibold leading-6 text-[#101115]"><Link href={data.href}>{data.name}</Link></h3>
          <Rating value={data.rating} count={data.reviews} />
        </div>
        <SaveButton data={data} business={business} />
      </article>
    );
  }

  const tone = { open: "text-[#2b7a26]", closing: "text-[#8a5a00]", closed: "text-[#b42318]" }[data.open?.tone] || "";
  const dot = { open: "bg-[#3fa535]", closing: "bg-[#d99a1c]", closed: "bg-[#d4382c]" }[data.open?.tone] || "";
  const ratingRow = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] leading-[18px]">
      {data.rating ? <span className="inline-flex items-center gap-1 font-semibold"><Star size={14} className="fill-[#002fa7] text-[#002fa7]" aria-hidden="true" />{data.rating.toFixed(1)}<span className="font-normal text-[#6e7079]">({data.reviews})</span></span> : <span className="text-[#6e7079]">No reviews yet</span>}
      {data.open && <span className={cx("inline-flex items-center gap-1.5 font-medium", tone)}><span className={cx("h-1.5 w-1.5 rounded-full", dot)} aria-hidden="true" />{data.open.text}</span>}
    </div>
  );

  if (layout === "list") {
    return (
      <article className={cx(shell, "flex flex-col sm:flex-row", className)}>
        <PhotoArea data={data} className="h-[160px] shrink-0 sm:h-auto sm:min-h-[168px] sm:w-[220px]" sizes="220px"><SaveButton data={data} business={business} /></PhotoArea>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-4">
          <p className="truncate font-eyebrow text-[11px] text-[#002fa7]">{data.eyebrow}{data.distance ? ` · ${data.distance}` : ""}</p>
          <h3 className="font-display text-[17px] font-semibold leading-6 text-[#101115]">
            <Link href={data.href} className="hover:text-[#002fa7]">{data.name}</Link>
            {data.verified && <BadgeCheck size={17} className="ml-1.5 inline-block -translate-y-px text-[#2b7a26]" aria-label="Verified business" />}
          </h3>
          {ratingRow}
          {data.description && <p className="line-clamp-2 max-w-[640px] text-[14px] leading-5 text-[#4a4c55]">{data.description}</p>}
          <div className="mt-auto flex items-center gap-2 pt-2">
            <Button type="secondary" size="s" href={data.href} className="h-10 px-4">View details</Button>
            {data.phone && <Button type="ghost" size="s" href={`tel:${data.phone}`} icon={<Phone size={18} aria-hidden="true" />} aria-label={`Call ${data.name}`} className="h-10 border border-[#dcdbd5] [&>svg]:shrink-0">Call</Button>}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={cx(shell, "flex h-full min-w-0 flex-col", className)}>
      <PhotoArea data={data} className="h-[132px] shrink-0" sizes="(max-width: 640px) 92vw, (max-width: 1280px) 33vw, 320px"><SaveButton data={data} business={business} /></PhotoArea>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="truncate font-eyebrow text-[11px] text-[#002fa7]">{data.eyebrow}{data.distance ? ` · ${data.distance}` : ""}</p>
        <h3 className="line-clamp-2 font-display text-[15px] font-semibold leading-5 text-[#101115]">
          <Link href={data.href} className="hover:text-[#002fa7]">{data.name}</Link>
          {data.verified && <BadgeCheck size={16} className="ml-1 inline-block -translate-y-px text-[#2b7a26]" aria-label="Verified business" />}
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] leading-[18px]">
          {data.rating ? <span className="inline-flex items-center gap-1 font-semibold"><Star size={14} className="fill-[#002fa7] text-[#002fa7]" aria-hidden="true" />{data.rating.toFixed(1)}<span className="font-normal text-[#6e7079]">({data.reviews})</span></span> : <span className="text-[#6e7079]">No reviews yet</span>}
          {data.open && <span className={cx("inline-flex items-center gap-1.5 font-medium", tone)}><span className={cx("h-1.5 w-1.5 rounded-full", dot)} aria-hidden="true" />{data.open.text}</span>}
        </div>
        {data.description && <p className="line-clamp-2 text-[13px] leading-[18px] text-[#4a4c55]">{data.description}</p>}
        <div className="mt-auto flex items-center gap-2 pt-2">
          <Button type="secondary" size="s" href={data.href} className="h-10 flex-1 px-3">View details</Button>
          {data.phone && <Button type="ghost" size="s" href={`tel:${data.phone}`} aria-label={`Call ${data.name}`} className="h-10 w-10 shrink-0 border border-[#dcdbd5] px-0 [&>svg]:shrink-0" icon={<Phone size={18} aria-hidden="true" />} />}
        </div>
      </div>
    </article>
  );
}
