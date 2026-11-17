import { notFound } from "next/navigation";
import BusinessProfileView from "@/components/BusinessProfileView";

// Local-only page: the profile rendered with the exact sample content from the Figma frame, for side-by-side checking.
export default function ProfileDesignCheck() {
  if (process.env.NODE_ENV === "production") notFound();
  const hours = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((day) => ({ day, isClosed: false, opens: "08:00", closes: day === "friday" || day === "saturday" ? "21:00" : "20:00" })).concat([{ day: "sunday", isClosed: true }]);
  const business = {
    _id: "figma-sample", name: "Filter & Fold Coffee House", category: { name: "Cafés", slug: "cafes" }, verificationStatus: "verified", listingStatus: "published",
    tagline: "A quiet corner on 12th Main, pouring South Indian filter coffee since 2019.",
    description: "Filter & Fold is a neighbourhood café that brews South Indian filter coffee to order in brass dabaras, alongside pour-overs from Chikmagalur estates. The kitchen serves an all-day breakfast — ghee podi idli, akki roti and sourdough toasts — and the upstairs room is kept quiet for reading and laptop work on weekdays.",
    averageRating: 4.6, reviewCount: 212, phone: "8040002190", whatsapp: "918040002190", website: "https://filterandfold.example",
    address: { addressLine1: "12th Main Road", locality: "Indiranagar", city: "Bengaluru", state: "Karnataka", postalCode: "560038", country: "IN" },
    images: ["/figma/hero-cafe.jpg", "/figma/hero-salon.jpg", "/figma/hero-bakery.jpg", "/figma/hero-tailor.jpg", "/figma/auth-spice.jpg"], photoCount: 18,
    amenities: ["Free Wi-Fi", "Vegan options", "Outdoor seating", "Card & UPI accepted", "Step-free entrance", "Takeaway"], languages: ["English", "Kannada", "Hindi", "Tamil"], establishedYear: 2019,
    serviceItems: [{ name: "Filter coffee (dabara)", priceFrom: 110 }, { name: "Pour-over of the week", priceFrom: 220 }, { name: "All-day breakfast", priceFrom: 180, priceTo: 340 }, { name: "Private events & workshops" }, { name: "Coffee beans to take home", priceFrom: 480 }],
    workingHours: hours, reviews: [], updatedAt: "2026-10-12T00:00:00Z",
  };
  return <BusinessProfileView business={business} related={[]} preview />;
}
