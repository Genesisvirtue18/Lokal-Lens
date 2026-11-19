import Link from "next/link";
import SiteHeader from "@/components/ds/SiteHeader";
import SiteFooter from "@/components/ds/SiteFooter";
import { Eyebrow } from "@/components/ds";
import { absoluteSiteUrl } from "@/lib/business-schema";

const canonical = absoluteSiteUrl("/terms");
export const metadata = {
  title: "Terms of Service | Lokal Lens",
  description: "The rules for using Lokal Lens: accounts, business listings, reviews, claiming a listing, inquiries and the Verified badge.",
  alternates: { canonical },
  openGraph: { type: "website", title: "Terms of Service | Lokal Lens", url: canonical, images: [absoluteSiteUrl("/opengraph-image")] },
};

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "";
const UPDATED = "19 November 2026";

// Plain-language terms. Have a lawyer review them before launch, and add your registered business name and address in the last section.
const SECTIONS = [
  ["about", "About Lokal Lens", [
    "Lokal Lens is a directory that helps people find local businesses and contact them directly. We show listings, photos, opening hours, reviews and contact details. We are not a party to anything between a customer and a business, and we do not take payments or bookings.",
    "By using the site or creating an account you agree to these terms and to our Privacy Policy.",
  ]],
  ["accounts", "Your account", [
    "Give true details and keep your password and authenticator codes private. You are responsible for what happens under your account.",
    "There are two kinds of account: customers (find businesses, save them, write reviews, send inquiries) and business owners (everything a customer can do, plus managing listings). Admin accounts belong to our team.",
    "We may suspend an account that breaks these terms, tries to break the site, or puts other people at risk.",
  ]],
  ["listings", "Business listings", [
    "A listing must describe a real business that you own or are allowed to represent. Details must be accurate and current: name, address, phone, opening hours, services and photos.",
    "New listings are checked by our team before they go live. If you change the name, phone number, category or city of a live listing, it is checked again and stays hidden until it is approved. Other edits go live straight away.",
    "Do not list businesses that sell anything illegal, do not copy another business’s listing, and do not use photos you have no right to use. You keep ownership of your content, and you allow us to display it on Lokal Lens and in search results.",
    "We may edit, hide or remove a listing that is inaccurate, misleading, duplicated, reported as closed, or against these terms.",
  ]],
  ["verified", "The Verified badge", [
    "The Verified badge means our team checked documents the business provided, such as a GST number or a shop licence. It is not an endorsement, a guarantee of quality, or a licence. A listing can be live without the badge.",
  ]],
  ["claims", "Claiming a listing", [
    "Some listings are added by our team on behalf of a business. The real owner can claim it by proving a connection: a code sent to the email on the listing, an email address on the business’s own website, or documents.",
    "If a listing already belongs to another owner, the claim is never handed over automatically. The current owner is told and can say it is wrong, and our team decides. False claims lead to account suspension.",
  ]],
  ["reviews", "Reviews and ratings", [
    "Reviews must come from real experience. You may not review your own business, ask others to post fake reviews, offer rewards for reviews, or write reviews for a competitor to harm them.",
    "Do not post hate, abuse, threats, private information (such as phone numbers or addresses of people), or advertising. Anyone can report a review. We may remove reviews that break these rules.",
    "A business may reply publicly to a review. Replies follow the same rules.",
  ]],
  ["inquiries", "Inquiries and contact", [
    "When you send an inquiry, we pass your name, phone number, email (if you gave one) and message to that business, so they can contact you. They may use these only to answer your inquiry. You can withdraw a signed-in inquiry from My account at any time.",
    "Businesses must not use inquiry details for unrelated marketing or share them with others.",
  ]],
  ["reporting", "Reporting a problem", [
    "Signed-in visitors can report a listing (wrong information, closed, duplicate, spam) or a review. Our team looks at every report and may hide the listing or remove the review. We may not tell you the outcome of every report.",
  ]],
  ["conduct", "Acceptable use", [
    "Do not scrape the site in bulk, overload it, try to get into accounts that are not yours, upload malware, or use the site to harass anyone.",
  ]],
  ["liability", "Our responsibility", [
    "Listings and reviews are written by businesses and customers, not by us. We try to keep the site accurate and available, but we provide it “as is”. Check important details (prices, timings, licences) with the business before you rely on them.",
    "To the extent the law allows, Lokal Lens is not responsible for losses that come from dealings between customers and businesses.",
  ]],
  ["changes", "Changes to these terms", [
    "We may update these terms. The date at the top shows the latest version. If you keep using Lokal Lens after a change, you accept it.",
  ]],
  ["contact", "Contact", [
    supportEmail ? `Questions about these terms: ${supportEmail}.` : "Questions about these terms? Use the Report links on any listing, or the contact details provided on our website.",
  ]],
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f1f1ee] text-[#101115]">
      <SiteHeader variant="desktop" active="" />
      <div className="mx-auto max-w-[860px] px-4 pb-20 pt-10 md:px-8 lg:pt-14">
        <header className="flex flex-col gap-3">
          <Eyebrow>Legal</Eyebrow>
          <h1 className="text-[32px] font-semibold leading-10 tracking-[-0.0341em] md:text-[44px] md:leading-[52px]">Terms of Service</h1>
          <p className="text-[15px] leading-6 text-[#4a4c55]">Last updated {UPDATED}. See also our <Link href="/privacy" className="font-medium text-[#002fa7] underline">Privacy Policy</Link>.</p>
        </header>
        <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-2">
          {SECTIONS.map(([id, title]) => <a key={id} href={`#${id}`} className="rounded-full border border-[#dcdbd5] bg-white px-3.5 py-1.5 font-display text-[13px] font-medium hover:border-[#002fa7] hover:text-[#002fa7]">{title}</a>)}
        </nav>
        <div className="mt-10 flex flex-col gap-10">
          {SECTIONS.map(([id, title, paragraphs], index) => (
            <section key={id} id={id} className="scroll-mt-28">
              <h2 className="text-[22px] font-semibold leading-8 tracking-[-0.0208em]"><span className="mr-2 font-mono text-[14px] text-[#6e7079]">{String(index + 1).padStart(2, "0")}</span>{title}</h2>
              <div className="mt-3 flex flex-col gap-3 text-[16px] leading-7 text-[#2d2f36]">{paragraphs.map((text) => <p key={text}>{text}</p>)}</div>
            </section>
          ))}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
