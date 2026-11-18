import { DM_Mono, DM_Sans, Newsreader, Poppins } from "next/font/google";
import "./globals.css";
import LocationPermissionOnEntry from "@/components/LocationPermissionOnEntry";
import { ConfirmProvider } from "@/components/ConfirmProvider";

// Fonts from the Lokal Lens Figma foundations: Poppins (headings/UI), DM Sans (body), DM Mono (labels), Newsreader Italic (editorial).
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap", axes: ["opsz"] });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-newsreader", display: "swap", axes: ["opsz"] });

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: "Lokal Lens | Find Trusted Local Businesses Near You",
  description: "Search local businesses across India by category and city. Compare verified listings, phone numbers, photos, hours and reviews on Lokal Lens.",
  applicationName: "Lokal Lens",
  openGraph: { type: "website", siteName: "Lokal Lens", locale: "en_IN", title: "Lokal Lens | Find Trusted Local Businesses Near You", description: "Search local businesses across India by category and city. Compare verified listings, phone numbers, photos, hours and reviews." },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${dmSans.variable} ${dmMono.variable} ${newsreader.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ConfirmProvider>
          <LocationPermissionOnEntry />
          {children}
        </ConfirmProvider>
      </body>
    </html>
  );
}
