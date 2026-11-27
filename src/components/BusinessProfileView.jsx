import Link from "next/link";
import { ChevronDown, ChevronRight, Globe, MessageCircle, Navigation, Sparkles, ImageIcon, MapPin, Phone } from "lucide-react";
import { FaFacebookF, FaInstagram, FaYoutube } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { businessDetailPath, categoryListingPath } from "@/lib/directory-data";
import { buildBusinessJsonLd, buildBreadcrumbJsonLd, buildFaqJsonLd, jsonLdString } from "@/lib/business-schema";
import { openStatus } from "@/lib/open-status";
import BusinessServices from "@/components/BusinessServices";
import BusinessActivityStats from "@/components/BusinessActivityStats";
import BusinessContactForm from "@/components/BusinessContactForm";
import { tidyText } from "@/lib/text";
import OfferCards from "@/components/OfferCards";
import BusinessProfileActions from "@/components/BusinessProfileActions";
import CustomerReviews from "@/components/CustomerReviews";
import AnchorTabs from "@/components/AnchorTabs";
import SiteHeader from "@/components/ds/SiteHeader";
import SiteFooter from "@/components/ds/SiteFooter";
import BusinessCard from "@/components/ds/BusinessCard";
import { Badge, Button, cx } from "@/components/ds";
import TrackedButton from "@/components/TrackedButton";
import ClaimBusiness from "@/components/ClaimBusiness";
import ReportListingButton from "@/components/ReportListingButton";
import { PhotoGrid, PhotoHero } from "@/components/PhotoGallery";


function Section({ id, eyebrow, title, children }) {
  return (
    <section id={id} className={`flex scroll-mt-36 flex-col gap-5 ${id === "overview" ? "" : "border-t border-[#dcdbd5] pt-10"}`}>
      <div className="flex flex-col gap-2">
        <p className="font-eyebrow text-[#002fa7]">{eyebrow}</p>
        <h2 className="text-[28px] font-semibold leading-9 tracking-[-0.02em]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ActionRow({ caption, children }) {
  return <div className="flex flex-col gap-1">{children}<p className="text-[14px] leading-5 text-[#6e7079]">{caption}</p></div>;
}

function validImage(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && url.hostname !== "example.com"; }
  catch { return false; }
}

function formatTime(value) {
  const [hours, minutes] = String(value || "").split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value || "";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}

// "9876543210" -> "+91 98 7XXX 3210": the full number is only shown once a person taps Call and confirms.
function maskPhone(value) {
  const d = String(value || "").replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `+91 ${d.slice(0, 2)} ${d[2]}XXX ${d.slice(6)}` : "";
}
function prettyPhone(value) {
  const d = String(value || "").replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : String(value || "");
}

function formatContactPhone(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  // Older imports sometimes stored a local mobile as `+828…` without country code.
  return digits.length === 10 ? digits : raw;
}

const paymentLabels = { cash: "Cash", upi: "UPI", debit_card: "Debit card", credit_card: "Credit card", net_banking: "Net banking", cheque: "Cheque", emi: "EMI", wallet: "Wallets" };



// The whole public business profile. Used by the live page and by the owner's preview.
export default function BusinessProfileView({ business, related = [], preview = false }) {
  const businessId = String(business._id || business.id || "");
  const businessSchema = buildBusinessJsonLd(business, businessDetailPath(business));
  const categoryName = business.category?.name || business.keywords?.[0] || "Business";
  const categorySlug = business.category?.slug || categoryName.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const address = [business.address?.addressLine1,business.address?.addressLine2,business.address?.landmark,business.address?.locality,business.address?.city,business.address?.state,business.address?.postalCode].filter(Boolean).join(", ");
  const workingHours = business.workingHours || [];
  // Holidays and festivals the owner has set (closed, or open on different hours): only the days still to come are shown.
  const todayIso = new Date().toLocaleDateString("en-CA");   // YYYY-MM-DD in the visitor's own time zone
  const upcomingSpecial = (business.specialHours || []).filter((day) => day?.date && day.date >= todayIso).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
  const formatDay = (date) => { try { return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch { return date; } };
  const highlights = business.highlights?.length ? business.highlights : business.keywords || [];
  const amenities = business.amenities || [];
  const contactPhone = formatContactPhone(business.phone);
  const contactPhoneHref = contactPhone.replace(/[^+\d]/g, "");
  const verified = business.verificationStatus === "verified";
  const photos = [...new Set([...(business.images || []), business.logo].filter(validImage))];
  const photoCount = Math.max(Number(business.photoCount)||0,photos.length);
  const coordinates = business.location?.coordinates;
  const coordinateQuery = coordinates ? `${coordinates[1]},${coordinates[0]}` : "";
  const mapQuery = address ? `${business.name}, ${address}` : coordinateQuery || business.name;
  // Name + address first, so Google Maps shows the business like a place; raw coordinates only when there is no address.
  const directionsQuery = address ? mapQuery : coordinateQuery || mapQuery;
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(directionsQuery)}`;
  const mapEmbedUrl = business.mapEmbedUrl && /^https:\/\/(www\.)?google\.com\/maps\/embed/.test(business.mapEmbedUrl) ? business.mapEmbedUrl : `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=17&output=embed`;
  const whatsappDigits = (business.whatsapp || "").replace(/\D/g, "");
  // wa.me needs the country code: a 10-digit Indian number gets 91 in front. The message opens pre-written, the person just presses send.
  const whatsappUrl = whatsappDigits.length >= 10 ? `https://wa.me/${whatsappDigits.length === 10 ? `91${whatsappDigits}` : whatsappDigits}?text=${encodeURIComponent(`Hi, I found ${business.name} on Lokal Lens and would like to know more.`)}` : null;
  const social = [["Facebook",business.socialLinks?.facebook,FaFacebookF],["Instagram",business.socialLinks?.instagram,FaInstagram],["YouTube",business.socialLinks?.youtube,FaYoutube],["X",business.socialLinks?.x,FaXTwitter]].filter(([,url])=>url);
  const activeOffers = (business.offers || []).filter(offer=>offer.isActive!==false && (!offer.validUntil || new Date(offer.validUntil)>=new Date()));
  const secondaryCategories = (business.secondaryCategories || []).filter(item => item && item.slug);
  const paymentModes = (business.paymentModes || []).map(mode => paymentLabels[mode]).filter(Boolean);
  const languages = business.languages || [];
  const serviceAreas = business.serviceAreas || [];
  const cityQuery = business.address?.city ? `&city=${encodeURIComponent(business.address.city)}` : "";
  const breadcrumbs = [{label:"Home",href:"/"},business.address?.city&&{label:business.address.city,href:`/directory?city=${encodeURIComponent(business.address.city)}`},{label:categoryName,href:`/directory?category=${encodeURIComponent(categorySlug)}`},{label:business.name}].filter(Boolean);

  const status = openStatus(business);
  const openBadge = status.tone === "open" ? { tone: "open", text: status.until ? `Open · until ${status.until}` : "Open now" } : status.tone === "closed" ? { tone: "closed", text: status.label } : null;
  const todayName = new Intl.DateTimeFormat("en-US", { timeZone: business.timeZone || "Asia/Kolkata", weekday: "long" }).format(new Date()).toLowerCase();
  const eyebrowLine = [categoryName, [business.address?.locality, business.address?.city].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
  const facts = [
    languages.length > 0 && ["Languages", languages.join(", ")],
    business.establishedYear && ["Established", String(business.establishedYear)],
    business.teamSize && ["Team size", `${business.teamSize} people`],
    business.responseTimeMinutes !== undefined && business.responseTimeMinutes !== null && ["Typical response", business.responseTimeMinutes < 60 ? `${business.responseTimeMinutes} min` : `${Math.round(business.responseTimeMinutes / 60)} hr`],
    paymentModes.length > 0 && ["Payments", paymentModes.join(", ")],
    serviceAreas.length > 0 && ["Areas served", serviceAreas.join(", ")],
    business.contactPerson?.name && ["Contact person", `${business.contactPerson.name}${business.contactPerson.designation ? `, ${business.contactPerson.designation}` : ""}`],
  ].filter(Boolean);
  const attributeList = [...new Set([...highlights, ...amenities, ...(business.homeDelivery ? ["Home delivery / service"] : []), ...(business.gstVerified ? ["GST verified"] : [])])];
  const tabs = [{ id: "overview", label: "Overview" }, { id: "services", label: "Services" }, { id: "photos", label: "Photos" }, { id: "customer-reviews", label: "Reviews" }, { id: "location", label: "Location" }];
  const updated = business.updatedAt ? new Date(business.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
  const backHref = `/directory?category=${encodeURIComponent(categorySlug)}${business.address?.city ? `&city=${encodeURIComponent(business.address.city)}` : ""}`;

  return (
    <main className="min-h-screen bg-[#f1f1ee] pb-20 text-[#101115] lg:pb-0">
      {!preview && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(businessSchema) }} />}
      {!preview && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(buildBreadcrumbJsonLd([{ name: "Home", path: "/" }, ...(business.address?.city ? [{ name: business.address.city, path: `/directory?city=${encodeURIComponent(business.address.city)}` }] : []), { name: categoryName, path: business.category?._id ? categoryListingPath(business.address?.city, business.category) : `/directory?category=${encodeURIComponent(categorySlug)}` }, { name: business.name }])) }} />}
      {!preview && buildFaqJsonLd(business.faqs) && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(buildFaqJsonLd(business.faqs)) }} />}
      <SiteHeader variant="compact" active="explore" cities={[]} city={business.address?.city || ""} cityBasePath="/directory" query={categoryName} />
      {preview && <div className="sticky top-16 z-30 border-b border-[#101115] bg-[#101115] px-4 py-2.5 text-center text-[14px] leading-5 text-white lg:top-[76px]"><strong className="font-semibold">Preview</strong> — this is how customers see your listing. Only you can see this page{business.listingStatus && business.listingStatus !== "published" ? " until it is approved" : ""}.</div>}

      {/* Profile nav */}
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 pb-4 pt-5 md:px-8 lg:px-[72px]">
        <Button type="ghost" size="s" href={backHref} style={{ paddingLeft: 0, paddingRight: 8, gap: 4 }} icon={<ChevronRight size={18} className="rotate-180" aria-hidden="true" />}>Back to results</Button>
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[14px] leading-5 text-[#4a4c55]">
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
              {crumb.href ? <Link href={crumb.href} className="text-[#002fa7] hover:underline">{crumb.label}</Link> : <span>{crumb.label}</span>}
              {index < breadcrumbs.length - 1 && <ChevronRight size={14} aria-hidden="true" />}
            </span>
          ))}
        </nav>
      </div>

      {/* Gallery */}
      <section aria-label={`${business.name} photos`} className="mx-auto max-w-[1440px] px-4 md:px-8 lg:px-[72px]">
        {photos.length ? (
          <PhotoHero photos={photos} name={business.name} photoCount={photoCount} />
        ) : (
          <div className="grid h-[260px] place-items-center rounded-[16px] border border-[#dcdbd5] bg-white text-center"><div className="flex flex-col items-center gap-2 text-[#6e7079]"><ImageIcon size={28} aria-hidden="true" /><p className="text-[14px]">This business hasn’t added photos yet.</p></div></div>
        )}
      </section>

      {/* Content */}
      <div className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-[1440px] items-start gap-12 px-4 pb-20 pt-9 md:px-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:px-[72px]">
        <div className="flex min-w-0 flex-col gap-10">
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-2">
                <p className="font-eyebrow text-[#002fa7]">{eyebrowLine}</p>
                <h1 className="text-[32px] font-semibold leading-10 tracking-[-0.0341em] md:text-[44px] md:leading-[52px]">{business.name}</h1>
              </div>
              <BusinessProfileActions business={{ id: businessId, name: business.name, href: businessDetailPath(business), category: categoryName, area: business.address?.locality || business.address?.city || "Location not provided", city: business.address?.city || "", address: business.address || {}, image: photos[0] || "", description: business.description || "", verified, phone: business.phone || "", isFeatured: Boolean(business.isFeatured), hasGooglePlaceId: business.hasGooglePlaceId }} />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {verified && <Badge tone="verified">Verified business</Badge>}
              {Number(business.reviewCount) > 0 ? <a href="#customer-reviews" className="inline-flex items-center gap-1 text-[14px] leading-5"><span className="font-semibold">{Number(business.averageRating).toFixed(1)}</span><span className="text-[#4a4c55]">({business.reviewCount} reviews)</span></a> : <span className="text-[14px] leading-5 text-[#6e7079]">No reviews yet</span>}
              {openBadge && <Badge tone={openBadge.tone}>{openBadge.text}</Badge>}
              {workingHours.length > 0 && <Link href="#location" className="inline-flex items-center font-display text-[14px] font-medium leading-5 text-[#002fa7] hover:underline">See all hours</Link>}
            </div>
            {business.tagline && <p className="max-w-[760px] font-serif text-[26px] leading-[34px] tracking-[-0.0115em]">{tidyText(business.tagline)}</p>}
          </div>

          <AnchorTabs tabs={tabs} />

          <Section id="overview" eyebrow="Overview" title={`About ${business.name}`}>
            <p className="whitespace-pre-line text-[18px] leading-7">{tidyText(business.description) || `${business.name} is a local ${categoryName.toLowerCase()} in ${business.address?.locality || business.address?.city || "your area"}. Contact the business directly for current information.`}</p>
            {attributeList.length > 0 && <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">{attributeList.slice(0, 12).map((item) => <li key={item} className="flex min-h-[50px] items-center gap-2.5 rounded-[12px] border border-[#dcdbd5] bg-white px-3 py-2.5 text-[14px] leading-5 sm:px-4 sm:py-3 sm:text-[15px]"><Sparkles size={18} className="shrink-0 text-[#002fa7]" aria-hidden="true" /><span className="min-w-0">{item}</span></li>)}</ul>}
            {facts.length > 0 && (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-5 border-y border-[#dcdbd5] py-5 sm:gap-x-3 lg:grid-cols-3">
                {facts.map(([label, value]) => <div key={label} className="flex flex-col gap-1.5"><dt className="font-eyebrow" style={{ fontWeight: 500, color: "#5a5c66", fontSize: 12 }}>{label}</dt><dd className="text-[18px] leading-6 text-[#101115]" style={{ fontWeight: 600 }}>{value}</dd></div>)}
              </dl>
            )}
            {secondaryCategories.length > 0 && <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3"><span className="font-eyebrow" style={{ fontWeight: 500, color: "#5a5c66", fontSize: 12 }}>Also listed under</span><div className="flex flex-wrap gap-2">{secondaryCategories.map((item) => <Link key={item.slug} href={`/directory?category=${encodeURIComponent(item.slug)}${cityQuery}`} className="inline-flex h-10 items-center rounded-full border border-[#dcdbd5] bg-white px-4 font-display text-[13px] font-medium text-[#002fa7] hover:border-[#002fa7]">{item.name}</Link>)}</div></div>}
            {(business.videoUrl || business.brochureUrl) && <div className="flex flex-wrap gap-3">{business.videoUrl && <Button type="secondary" size="s" href={business.videoUrl} target="_blank" rel="noreferrer">Watch video</Button>}{business.brochureUrl && <Button type="secondary" size="s" href={business.brochureUrl} target="_blank" rel="noreferrer">View brochure / menu</Button>}</div>}
          </Section>

          <BusinessServices services={business.serviceItems?.length ? business.serviceItems : business.services || []} />

          {activeOffers.length > 0 && (
            <Section id="offers" eyebrow="Offers" title="Current offers">
              <OfferCards offers={activeOffers} />
            </Section>
          )}

          <Section id="photos" eyebrow={`Photos · ${photoCount || photos.length}`} title="Photos">
            {photos.length ? (
              <PhotoGrid photos={photos} name={business.name} total={photoCount} />
            ) : <p className="rounded-[16px] border border-[#dcdbd5] bg-white px-6 py-8 text-center text-[14px] text-[#4a4c55]">No business photos have been added yet.</p>}
          </Section>

          <section id="customer-reviews" className="scroll-mt-36"><CustomerReviews key={businessId} businessId={businessId} businessName={business.name} initialReviews={business.reviews || []} initialAverage={Number(business.averageRating) || 0} initialCount={Number(business.reviewCount) || 0} /></section>

          <Section id="location" eyebrow="Location" title="Location & hours">
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_340px]">
              <div className="flex flex-col gap-4">
                <div className="relative h-[280px] overflow-hidden rounded-[16px] border border-[#dcdbd5] bg-[#e8e7e1]">
                  <iframe title={`Map showing ${business.name}`} src={mapEmbedUrl} className="absolute inset-0 h-full w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                </div>
                <div className="flex flex-col gap-3 rounded-[16px] border border-[#dcdbd5] bg-white p-5">
                  <p className="font-eyebrow text-[#6e7079]">Address</p>
                  <p className="text-[16px] leading-6">{address || "Address not provided"}</p>
                  <div className="flex flex-wrap gap-2 pt-1"><TrackedButton event="directions" businessName={business.name} label={"Google Maps"} external={true} businessId={preview ? "" : businessId} type="secondary" size="s" href={directionsUrl} target="_blank" rel="noreferrer" icon={<MapPin size={18} aria-hidden="true" />}>Get directions</TrackedButton></div>
                </div>
              </div>
              <div className="self-start overflow-hidden rounded-[12px] border border-[#dcdbd5] bg-white">
                <div className="flex items-center justify-between border-b border-[#dcdbd5] px-5 py-4"><h3 className="font-display text-[16px] font-semibold">Hours</h3>{openBadge && <Badge tone={openBadge.tone}>{openBadge.text}</Badge>}</div>
                {workingHours.length ? workingHours.map((entry, index) => (
                  <div key={entry.day} className={cx("flex justify-between gap-3 px-5 py-3 text-[14px] leading-5", index && "border-t border-[#ecebe7]", entry.day === todayName && "bg-[#e6ebf7] font-semibold")}>
                    <span className="capitalize">{entry.day}</span>
                    <span className={cx("text-right", entry.isClosed ? "text-[#b3261e]" : "")}>{entry.isClosed ? "Closed" : entry.is24Hours ? "Open 24 hours" : `${formatTime(entry.opens)} – ${formatTime(entry.closes)}${entry.breakStart && entry.breakEnd ? ` (break ${formatTime(entry.breakStart)}–${formatTime(entry.breakEnd)})` : ""}`}</span>
                  </div>
                )) : <p className="px-5 py-4 text-[14px] text-[#4a4c55]">Hours haven’t been added.</p>}
                {upcomingSpecial.length > 0 && (
                  <div className="border-t border-[#dcdbd5] bg-[#f7f7f4] px-5 py-4">
                    <h4 className="font-display text-[14px] font-semibold">Special days</h4>
                    <ul className="mt-2 flex flex-col gap-1.5 text-[14px] leading-5">
                      {upcomingSpecial.map((day) => (
                        <li key={`${day.date}-${day.label}`} className="flex justify-between gap-3"><span>{day.label} <span className="text-[#6e7079]">· {formatDay(day.date)}</span></span><span className={cx("text-right", day.isClosed !== false ? "text-[#b3261e]" : "")}>{day.isClosed !== false ? "Closed" : `${formatTime(day.opens)} – ${formatTime(day.closes)}`}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </Section>

          <Section eyebrow="Trust & ownership" title="About this listing">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2.5 rounded-[16px] bg-[#e7f4e5] p-6">
                <h3 className="font-display text-[16px] font-semibold leading-6 text-[#2b7a26]">What “Verified” means</h3>
                <p className="text-[14px] leading-5">{verified ? "We confirmed that the owner controls the listed contact details and that the business operates at this address." : "This listing has not completed Lokal Lens verification. Contact the business to confirm current details."} Verification does not mean every service or claim has been independently reviewed.</p>
              </div>
              <div className="flex flex-col gap-2.5 rounded-[16px] border border-[#dcdbd5] bg-white p-6">
                <h3 className="font-display text-[16px] font-semibold leading-6">Something wrong?</h3>
                <p className="text-[14px] leading-5 text-[#4a4c55]">{updated ? `Owner last updated this profile on ${updated}. ` : ""}If details are wrong or out of date, let us know. If it’s your business, use “Claim this listing” next to the contact details.</p>
                {!preview && businessId && <div><ReportListingButton businessId={businessId} businessName={business.name} /></div>}
                <p className="font-meta text-[#6e7079]">Listing ID {businessId.slice(-8).toUpperCase()}</p>
              </div>
            </div>
          </Section>

          {business.faqs?.length > 0 && (
            <Section eyebrow="FAQ" title="Common questions">
              <div className="flex flex-col gap-3">{business.faqs.map((faq) => <details key={faq._id || faq.question} className="group rounded-[12px] border border-[#dcdbd5] bg-white px-5 py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-display text-[16px] font-semibold">{faq.question}<ChevronDown size={18} className="shrink-0 transition group-open:rotate-180" aria-hidden="true" /></summary><p className="mt-3 border-t border-[#ecebe7] pt-3 text-[16px] leading-6 text-[#4a4c55]">{faq.answer}</p></details>)}</div>
            </Section>
          )}
        </div>

        {/* Contact panel */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          <section className="flex flex-col gap-4 rounded-[20px] border border-[#dcdbd5] bg-white p-6 shadow-[0_1px_2px_rgba(16,17,21,.04),0_8px_24px_rgba(16,17,21,.06)]">
            <h2 className="font-display text-[18px] font-semibold leading-[26px] tracking-[-0.0111em]">Contact {business.name}</h2>
            {contactPhone && <ActionRow caption="Calls the business directly"><TrackedButton event="call" businessName={business.name} label={prettyPhone(contactPhone)} external={false} businessId={preview ? "" : businessId} type="primary" href={`tel:${contactPhoneHref}`} icon={<Phone size={18} aria-hidden="true" />} className="w-full">Call {maskPhone(contactPhone) || "now"}</TrackedButton></ActionRow>}
            {whatsappUrl && <ActionRow caption="Opens WhatsApp — a new chat with the business"><TrackedButton event="whatsapp" businessName={business.name} label={"WhatsApp"} external={true} businessId={preview ? "" : businessId} type="secondary" href={whatsappUrl} target="_blank" rel="noreferrer" icon={<MessageCircle size={18} aria-hidden="true" />} className="w-full">WhatsApp</TrackedButton></ActionRow>}
            <ActionRow caption="Opens Google Maps in a new tab"><TrackedButton event="directions" businessName={business.name} label={"Google Maps"} external={true} businessId={preview ? "" : businessId} type="secondary" href={directionsUrl} target="_blank" rel="noreferrer" icon={<Navigation size={18} aria-hidden="true" />} className="w-full">Get directions</TrackedButton></ActionRow>
            {business.website && <ActionRow caption="Opens the business’s own website in a new tab"><TrackedButton event="website" businessName={business.name} label="" external={true} businessId={preview ? "" : businessId} type="secondary" href={business.website} target="_blank" rel="noreferrer" icon={<Globe size={18} aria-hidden="true" />} className="w-full">Website</TrackedButton></ActionRow>}
            {(business.email || business.alternatePhone || business.landline || business.tollFree || social.length > 0) && (
              <div className="flex flex-col gap-2 border-t border-[#dcdbd5] pt-4 text-[14px] leading-5 text-[#4a4c55]">
                {business.alternatePhone && <a className="hover:text-[#002fa7]" href={`tel:${business.alternatePhone}`}>Alternate · {business.alternatePhone}</a>}
                {business.landline && <a className="hover:text-[#002fa7]" href={`tel:${business.landline.replace(/[^+\d]/g, "")}`}>Landline · {business.landline}</a>}
                {business.tollFree && <a className="hover:text-[#002fa7]" href={`tel:${business.tollFree.replace(/[^+\d]/g, "")}`}>Toll-free · {business.tollFree}</a>}
                {social.length > 0 && <div className="flex flex-wrap gap-x-4 gap-y-1">{social.map(([label, url, Icon]) => <a key={label} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[#002fa7] hover:underline"><Icon size={14} aria-hidden="true" />{label}</a>)}</div>}
              </div>
            )}
            <div className="flex flex-col gap-2 border-t border-[#dcdbd5] pt-4">{openBadge && <div><Badge tone={openBadge.tone}>{openBadge.text}</Badge></div>}<p className="text-[14px] leading-5 text-[#4a4c55]">{[business.address?.addressLine1, business.address?.locality].filter(Boolean).join(", ") || business.address?.city || ""}</p></div>
          </section>
          <BusinessContactForm businessId={businessId} businessName={business.name} services={(business.services || []).map((item) => (typeof item === "string" ? item : item?.name)).filter(Boolean)} />
          {!preview && businessId && <ClaimBusiness businessId={businessId} businessName={business.name} />}
          {!preview && <BusinessActivityStats key={businessId} businessId={businessId} />}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="bg-white">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-12 md:px-8 lg:px-[72px] lg:py-16">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="flex flex-col gap-2.5"><p className="font-eyebrow text-[#002fa7]">Nearby · Same category</p><h2 className="text-[28px] font-semibold leading-9 tracking-[-0.0294em] md:text-[34px] md:leading-[42px]">More {categoryName.toLowerCase()} in {business.address?.locality || business.address?.city || "your area"}</h2></div>
              <Button type="secondary" href={backHref}>See all</Button>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{related.map((item) => <BusinessCard key={item._id || item.slug || item.name} business={item} layout="grid" />)}</div>
          </div>
        </section>
      )}
      {(contactPhone || whatsappUrl) && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-[#dcdbd5] bg-white p-3 lg:hidden" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          {contactPhone && <TrackedButton event="call" businessName={business.name} label={prettyPhone(contactPhone)} external={false} businessId={preview ? "" : businessId} type="primary" href={`tel:${contactPhoneHref}`} icon={<Phone size={18} aria-hidden="true" />} className="flex-1">Call</TrackedButton>}
          {whatsappUrl && <TrackedButton event="whatsapp" businessName={business.name} label={"WhatsApp"} external={false} businessId={preview ? "" : businessId} type="secondary" href={whatsappUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1">WhatsApp</TrackedButton>}
          <TrackedButton event="directions" businessName={business.name} label={"Google Maps"} external={false} businessId={preview ? "" : businessId} type="secondary" href={directionsUrl} target="_blank" rel="noreferrer" aria-label="Get directions" style={{ width: 48, paddingLeft: 0, paddingRight: 0 }} />
        </div>
      )}
      {(contactPhone || whatsappUrl) && <div className="lg:hidden" style={{ height: 88 }} aria-hidden="true" />}
      <SiteFooter />
    </main>
  );
}
