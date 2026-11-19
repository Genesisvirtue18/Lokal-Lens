import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const apiOrigin = (() => { try { return new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").origin; } catch { return ""; } })();

// Browser-side protections: who can run scripts on our pages, who can frame them, and what they may talk to.
// Scripts and styles keep 'unsafe-inline' because Next.js writes small inline bootstrap scripts; everything else is locked down.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/client${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
  "img-src 'self' data: blob: https: http://localhost:5000", // listing photos come from Cloudinary, Google and map tiles
  "font-src 'self' data:",
  `connect-src 'self' https://accounts.google.com/gsi/ ${apiOrigin}${isDev ? " ws://localhost:3000" : ""}`.trim(),
  "frame-src https://www.google.com https://maps.google.com https://accounts.google.com/gsi/", // Google Maps embeds on listing pages
  "frame-ancestors 'none'", // nobody can put the site inside their own page (clickjacking)
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  // Lets a second dev server (the isolated browser-test stack) run next to the normal one without sharing build files.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      // Photos served by the local API while developing without Cloudinary.
      { protocol: "http", hostname: "localhost", port: "5000" },
    ],
  },
};

export default nextConfig;
