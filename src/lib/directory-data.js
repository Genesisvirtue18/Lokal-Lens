const gradients = [
  "from-[#f3d9c0] via-[#fff3e2] to-[#d5b58e]",
  "from-[#c8eaf4] via-[#f3fbff] to-[#86d4ea]",
  "from-[#f1dfc8] via-[#fff8ef] to-[#d6ad83]",
  "from-[#d6edf2] via-[#f7fcfd] to-[#95d6dd]",
  "from-[#e2e1f8] via-[#fafaff] to-[#a3a0f0]",
];

export function toSeoSlug(value = "") {
  return String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// The category part of a listing's address. A category arrives as an object ({ name, slug }), as a plain name, or not at all;
// a bare database id says nothing to a reader, so it is skipped. The listing page redirects to the exact address if this guess differs.
function categorySegment(business) {
  const { category, categorySlug } = business;
  const text = categorySlug || category?.slug || category?.name || (typeof category === "string" && !/^[a-f0-9]{24}$/i.test(category) ? category : "");
  return toSeoSlug(text) || "business";
}

// /<city>/<category>/<business-name>/<id>_BZDET
export function businessDetailPath(business) {
  const city = toSeoSlug(business.address?.city || "india") || "india";
  const name = toSeoSlug(business.slug || business.name || "business");
  const identifier = business._id || business.id || business.slug;
  return `/${city}/${categorySegment(business)}/${name}/${encodeURIComponent(identifier)}_BZDET`;
}

export function categoryListingPath(city, category) {
  const citySlug = toSeoSlug(city || "india") || "india";
  const categorySlug = toSeoSlug(category?.slug || category?.name || "businesses");
  const categoryId = category?._id || category?.id || categorySlug;
  return `/${citySlug}/${categorySlug}/nct-${encodeURIComponent(categoryId)}`;
}

function imageUrl(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  const markdownUrl = trimmed.match(/^!?\[[^\]]*\]\((https?:\/\/[^)]+)\)$/);
  return markdownUrl?.[1] || trimmed;
}

export function toDirectoryBusiness(business, index = 0) {
  const nameParts = (business.name || "Business").split(/\s+/).filter(Boolean);
  const closingHour = business.workingHours?.find((entry) => !entry.isClosed)?.closes;
  return {
    ...business,
    category: business.category?.name || business.keywords?.[0] || "Business",
    categorySlug: business.category?.slug || business.categorySlug,
    area: business.address?.locality || business.address?.city || "Location not provided",
    status: business.listingStatus === "published" ? "Published" : "Pending review",
    closesAt: closingHour ? `Closes ${closingHour}` : undefined,
    short: nameParts.slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
    badge: business.verificationStatus === "verified" ? "Verified" : "Business",
    verified: business.verificationStatus === "verified",
    swatch: gradients[index % gradients.length],
    image: imageUrl(business.images?.[0] || business.logo),
  };
}

export function toHomeBusiness(business) {
  return {
    ...business,
    category: business.category?.name || business.keywords?.[0] || "Business",
    categorySlug: business.category?.slug || business.categorySlug,
    city: business.address?.city || "Location not provided",
    image: imageUrl(business.images?.[0] || business.logo),
  };
}
