import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { PageHeading } from "@/components/shared/page-heading";
import { ProfileSection } from "@/components/profile/profile-section";
import { SecuritySection } from "@/components/profile/security-section";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth/current-user";
import { formatDate } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata(
  "Profile",
  "Your learner account details on nuclearsafety.net.",
);

export default async function ProfilePage() {
  const user = await requireUser();
  const [row] = await db().select({ passwordChangedAt: schema.users.passwordChangedAt }).from(schema.users).where(eq(schema.users.id, user.id));

  return (
    <>
      <PageHeading title="Profile" subtitle="Manage your account details and password." />
      <div className="account-col">
        <ProfileSection initial={{
          name: user.name,
          email: user.email,
          jobTitle: user.jobTitle ?? "",
          department: user.department ?? "",
          organisation: user.organizationName ?? "",
        }} />
        <SecuritySection lastChanged={row?.passwordChangedAt ? formatDate(row.passwordChangedAt) : null} />
      </div>
    </>
  );
}
