import { ResetPasswordForm } from "@/components/PasswordForms";

export const metadata = { title: "Reset Password | Lokal Lens", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={typeof token === "string" ? token : ""} />;
}
