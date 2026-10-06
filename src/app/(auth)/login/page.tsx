import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata(
  "Sign in",
  "Sign in to your nuclear safety training account.",
  { ogDescription: "Sign in to access your assigned nuclear safety training.", twitterCard: "summary" },
);

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <>
      <div className="login-form-heading">
        <h2>Sign in to your account</h2>
        <p>Use the email address assigned by your training coordinator.</p>
      </div>
      <LoginForm />
      <p className="login-note">Accounts are created by your training coordinator. New users receive an email to set their password.</p>
    </>
  );
}
