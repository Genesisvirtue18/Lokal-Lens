import DashboardApp from "@/dashboard/DashboardApp";

export const metadata = { title: "Add your business | Lokal Lens", robots: { index: false, follow: false } };

// Opens the owner dashboard on the add / edit form, so the sidebar stays in place.
export default function AddBusinessPage() {
  return <DashboardApp role="owner" initialTab="form" />;
}
