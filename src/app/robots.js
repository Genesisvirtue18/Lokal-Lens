import { absoluteSiteUrl } from "@/lib/business-schema";

export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/business-owner", "/login", "/register", "/saved", "/forgot-password", "/reset-password", "/api/"] }],
    sitemap: absoluteSiteUrl("/sitemap.xml"),
    host: absoluteSiteUrl("/"),
  };
}
