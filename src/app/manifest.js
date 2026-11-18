export default function manifest() {
  return {
    name: "Lokal Lens: find trusted local businesses",
    short_name: "Lokal Lens",
    description: "Search local businesses across India by category and city, with phone numbers, photos, hours and reviews.",
    start_url: "/",
    display: "standalone",
    background_color: "#f1f1ee",
    theme_color: "#002fa7",
    lang: "en-IN",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }, { src: "/logo.png", sizes: "512x512", type: "image/png" }],
  };
}
