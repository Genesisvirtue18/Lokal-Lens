import DashboardApp from "@/dashboard/DashboardApp";

export const metadata = { title: "Admin Dashboard | Lokal Lens", robots: { index: false, follow: false } };

export default function AdminDashboardPage() {
  return <DashboardApp role="admin" />;
}
