import type { Metadata } from "next";
import { LearnerDirectory } from "@/components/admin/learners/learner-directory";
import { requireAdmin } from "@/lib/auth/current-user";
import { pageMetadata } from "@/lib/metadata";
import { listAdminCourses } from "@/lib/services/catalogue";
import { organizationOptions } from "@/lib/services/organizations";
import { listLearners } from "@/lib/services/people";

export const metadata: Metadata = pageMetadata(
  "Learners",
  "View and manage learner accounts and training assignments.",
);

export default async function AdminLearnersPage() {
  const { scope } = await requireAdmin();
  const [rows, courses, organizations] = await Promise.all([
    listLearners(scope),
    listAdminCourses(scope),
    scope.kind === "platform" ? organizationOptions() : Promise.resolve([]),
  ]);
  return (
    <LearnerDirectory
      rows={rows}
      courses={courses.map((c) => ({ id: c.id, label: c.title, meta: c.code }))}
      organizations={organizations}
      isPlatform={scope.kind === "platform"}
      organizationName={scope.kind === "organization" ? scope.organizationName : null}
    />
  );
}
