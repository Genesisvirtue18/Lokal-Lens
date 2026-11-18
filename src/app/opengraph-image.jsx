import { ImageResponse } from "next/og";

export const alt = "Lokal Lens: find trusted local businesses near you";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The default preview when a page is shared on WhatsApp, Facebook or X and has no photo of its own.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#002fa7", color: "#ffffff", padding: 72 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 40, fontWeight: 700 }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 24, height: 24, borderRadius: 12, background: "#002fa7" }} /></div>
          Lokal Lens
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2 }}>Find trusted local businesses near you</div>
          <div style={{ fontSize: 32, color: "#cfd9f6" }}>Phone numbers, photos, opening hours and reviews</div>
        </div>
      </div>
    ),
    size,
  );
}
