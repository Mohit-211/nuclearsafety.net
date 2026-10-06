import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { pageMetadata } from "@/lib/metadata";
import { findValidToken } from "@/lib/services/password-tokens";

export const metadata: Metadata = pageMetadata(
  "Set password",
  "Choose a password for your training account.",
  { twitterCard: "summary", noIndex: true },
);

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const raw = (await searchParams).token;
  const token = typeof raw === "string" ? raw : "";
  const valid = token ? await findValidToken(token) : null;

  if (!valid) {
    return (
      <div role="alert">
        <div className="login-form-heading">
          <h2>Link expired</h2>
          <p>This password link is invalid or has already been used. Request a new one and use the most recent email.</p>
        </div>
        <Link href="/forgot-password" className="text-link mt-6 text-xs">Request a new link</Link>
      </div>
    );
  }
  return <ResetPasswordForm token={token} invite={valid.purpose === "invite"} />;
}
