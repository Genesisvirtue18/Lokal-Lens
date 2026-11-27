import PageLoader from "@/components/PageLoader";

// Home only (a loading file higher up would turn real redirect and "not found" answers on other pages into 200).
// Other pages show the same loader from NavigationProgress while a navigation is slow.
export default function Loading() {
  return <PageLoader />;
}
