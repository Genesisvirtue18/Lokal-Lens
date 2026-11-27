import PageLoader from "@/components/PageLoader";

// Shown while any page without its own loading screen is on its way (first visit to Home, slow connections, moving between pages).
export default function Loading() {
  return <PageLoader />;
}
