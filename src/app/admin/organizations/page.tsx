import type { Metadata } from "next";
import { OrganizationList } from "@/components/admin/organizations/organization-list";
import { requirePlatformAdmin } from "@/lib/auth/current-user";
import { pageMetadata } from "@/lib/metadata";
import { listOrganizations } from "@/lib/services/organizations";

export const metadata: Metadata = pageMetadata(
  "Organizations",
  "Corporate customers, their administrators and course access.",
);

export default async function AdminOrganizationsPage() {
  await requirePlatformAdmin();
  return <OrganizationList rows={await listOrganizations()} />;
}
