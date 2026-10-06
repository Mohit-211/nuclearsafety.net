import type { Metadata } from "next";
import { ReportsView } from "@/components/admin/reports/reports-view";
import { requireAdmin } from "@/lib/auth/current-user";
import { pageMetadata } from "@/lib/metadata";
import { listAdminCourses } from "@/lib/services/catalogue";
import { reportRows } from "@/lib/services/reports";

export const metadata: Metadata = pageMetadata(
  "Reports",
  "Training completion and compliance reports.",
);

export default async function AdminReportsPage() {
  const { scope } = await requireAdmin();
  const [rows, courses] = await Promise.all([reportRows(scope), listAdminCourses(scope)]);
  return (
    <ReportsView
      rows={rows}
      courses={courses.map((c) => ({ id: c.id, label: c.title, meta: c.code }))}
      isPlatform={scope.kind === "platform"}
      scopeName={scope.kind === "platform" ? "the whole platform" : scope.organizationName}
    />
  );
}
