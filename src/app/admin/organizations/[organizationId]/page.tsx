import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/shared/back-link";
import { OrganizationDetail } from "@/components/admin/organizations/organization-detail";
import { requirePlatformAdmin } from "@/lib/auth/current-user";
import { pageMetadata } from "@/lib/metadata";
import { getOrganization } from "@/lib/services/organizations";

export const metadata: Metadata = pageMetadata("Organization detail", "Manage an organization's members and course access.", { noIndex: true });

export default async function AdminOrganizationPage({ params }: PageProps<"/admin/organizations/[organizationId]">) {
  await requirePlatformAdmin();
  const id = Number((await params).organizationId);
  const data = Number.isInteger(id) && id > 0 ? await getOrganization(id) : null;
  if (!data) notFound();

  return (
    <>
      <BackLink href="/admin/organizations">Back to organizations</BackLink>
      <OrganizationDetail
        organization={{ id: data.organization.id, name: data.organization.name, status: data.organization.status }}
        members={data.members}
        courses={data.courses.map((c) => ({ id: c.id, code: c.code, title: c.title, statusLabel: c.statusLabel, grantedOn: c.grantedOn }))}
        availableCourses={data.availableCourses.map((c) => ({ id: c.id, code: c.code, title: c.title }))}
      />
    </>
  );
}
