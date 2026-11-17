import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
