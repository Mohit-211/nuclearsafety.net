import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata(
  "Reset password",
  "Request a password reset link for your training account.",
  {
    ogDescription: "Request a password reset link for your nuclear safety training account.",
    twitterCard: "summary",
  },
);

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
