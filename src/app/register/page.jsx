import LoginPage from "@/app/login/page";

export const metadata = { title: "Create your account | Lokal Lens", robots: { index: false, follow: true } };

// "Add your business" sends people here with ?next=/add-business, so they start as a business owner.
export default async function RegisterPage({ searchParams }) {
  const { next } = await searchParams;
  return <LoginPage initialRegistering initialRole={typeof next === "string" && next.startsWith("/add-business") ? "business_owner" : "customer"} />;
}
