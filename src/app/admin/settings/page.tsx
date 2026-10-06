import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { PageHeading } from "@/components/shared/page-heading";
import { GeneralSection } from "@/components/admin/settings/general-section";
import { TrainingSection } from "@/components/admin/settings/training-section";
import { SecuritySection } from "@/components/profile/security-section";
import { db, schema } from "@/db";
import { requirePlatformAdmin } from "@/lib/auth/current-user";
import { formatDate } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { getSettings } from "@/lib/services/settings";

export const metadata: Metadata = pageMetadata(
  "Settings",
  "Platform settings.",
);

export default async function AdminSettingsPage() {
  const { user } = await requirePlatformAdmin();
  const [settings, [row]] = await Promise.all([
    getSettings(),
    db().select({ passwordChangedAt: schema.users.passwordChangedAt }).from(schema.users).where(eq(schema.users.id, user.id)),
  ]);

  return (
    <>
      <PageHeading title="Settings" subtitle="Configuration for the training platform." />
      <div className="account-col">
        <GeneralSection initial={{ supportEmail: settings.supportEmail, supportMessage: settings.supportMessage }} />
        <TrainingSection initial={{ defaultDueDays: settings.defaultDueDays }} />
        <SecuritySection title="Account & security" lastChanged={row?.passwordChangedAt ? formatDate(row.passwordChangedAt) : null} />
      </div>
    </>
  );
}
