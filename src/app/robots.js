import { absoluteSiteUrl } from "@/lib/business-schema";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private areas, and the endless search/filter variations of the directory (clean category and city pages stay open).
        disallow: ["/admin", "/business-owner", "/login", "/register", "/saved", "/forgot-password", "/reset-password", "/add-business", "/design-check", "/ask", "/api/", "/directory?*", "/*?lat=", "/*?lng="],
      },
    ],
    sitemap: absoluteSiteUrl("/sitemap.xml"),
  };
}
