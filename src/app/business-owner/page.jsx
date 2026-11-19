import DashboardApp from "@/dashboard/DashboardApp";

export const metadata = { title: "Business Owner Dashboard | Lokal Lens", robots: { index: false, follow: false } };

export default function BusinessOwnerDashboardPage() {
  return <DashboardApp role="owner" />;
}
