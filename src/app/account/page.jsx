import CustomerApp from "@/dashboard/CustomerApp";

export const metadata = { title: "My account | Lokal Lens", robots: { index: false, follow: false } };

export default function AccountPage() {
  return <CustomerApp />;
}
