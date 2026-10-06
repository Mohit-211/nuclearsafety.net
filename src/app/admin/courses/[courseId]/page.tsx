import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { BackLink } from "@/components/shared/back-link";
import { StatsGrid } from "@/components/shared/stat-card";
import { InfoPanel, ProgressSummaryPanel } from "@/components/admin/shared/detail-panels";
import { CourseDetailHeader } from "@/components/admin/courses/course-detail-header";
import { CourseEnrollmentTable } from "@/components/admin/courses/course-enrollment-table";
import { CourseVersionsTable } from "@/components/admin/courses/course-versions-table";
import { getCurrentUser, requireAdmin } from "@/lib/auth/current-user";
import { adminScopeFor, canManageCatalogue, type AdminScope } from "@/lib/auth/policy";
import { statusClass } from "@/lib/format";
import { pageMetadata, unavailableMetadata } from "@/lib/metadata";
import { defaultDueDate } from "@/lib/services/admin-pages";
import { getAdminCourse } from "@/lib/services/catalogue";
import { learnerOptions } from "@/lib/services/people";

async function load(scope: AdminScope, params: Promise<{ courseId: string }>) {
  const id = Number((await params).courseId);
  return Number.isInteger(id) && id > 0 ? getAdminCourse(scope, id) : null;
}

export async function generateMetadata({ params }: PageProps<"/admin/courses/[courseId]">): Promise<Metadata> {
  const user = await getCurrentUser();
  const scope = user ? adminScopeFor(user) : null;
  const data = scope ? await load(scope, params) : null;
  return data
    ? pageMetadata(`${data.course.title} — Course detail`, `Administration overview for the ${data.course.title} training course.`, { noIndex: true })
    : unavailableMetadata("Course");
}

export default async function AdminCourseDetailPage({ params }: PageProps<"/admin/courses/[courseId]">) {
  const { scope } = await requireAdmin();
  const data = await load(scope, params);
  if (!data) notFound();
  const { course, activeVersion, stats, enrollments, versions, organizations } = data;
  const manage = canManageCatalogue(scope);
  const [learners, due] = await Promise.all([learnerOptions(scope), defaultDueDate()]);

  return (
    <>
      <BackLink href="/admin/courses">Back to courses</BackLink>
      <CourseDetailHeader
        course={{
          id: course.id, code: course.code, title: course.title, description: course.description ?? "", category: course.category ?? "",
          estimatedDuration: course.estimatedDuration ?? "", isMandatory: course.isMandatory, status: course.status, statusLabel: course.statusLabel,
        }}
        subtitle={`${course.code} · ${course.category ?? "Uncategorised"}`}
        canManageCatalogue={manage}
        hasActiveVersion={!!activeVersion}
        enrolled={enrollments.map((e) => ({ id: e.userId, label: e.learner, meta: e.organization ?? e.department }))}
        learnerOptions={learners}
        defaultDueDate={due}
      />

      <StatsGrid
        stats={[
          { label: "Enrolled learners", value: stats.enrolled, note: scope.kind === "platform" ? "Assigned to this course" : `In ${scope.organizationName}` },
          { label: "In progress", value: stats.inProgress, note: "Currently working through the course" },
          { label: "Completed", value: stats.completed, note: "Completed (and not failed)" },
          { label: "Completion rate", value: `${stats.completionRate}%`, note: "Across all enrolled learners" },
        ].map((stat) => ({ ...stat, icon: Users, iconSize: 16 }))}
      />

      <div className="admin-course-grid">
        <InfoPanel
          id="course-info-heading"
          title="Course information"
          wideLabel="Description"
          rows={[
            ["Course code", course.code],
            ["Category", course.category ?? "—"],
            ["Description", course.description || "—"],
            ["Estimated duration", course.estimatedDuration ?? "—"],
            ["Package", activeVersion ? `SCORM ${activeVersion.scormVersion} · version ${activeVersion.versionNumber}` : "No active package"],
            ["Modules", activeVersion ? `${activeVersion.modules.length}` : "—"],
            ["Status", <span key="status" className={`badge ${statusClass(course.statusLabel)}`}>{course.statusLabel}</span>],
            ["Mandatory", course.isMandatory ? "Yes" : "No"],
            ...(manage ? [["Organizations with access", organizations.length
              ? <span key="orgs">{organizations.map((o, i) => <span key={o.id}>{i > 0 && ", "}<Link className="hover:underline" href={`/admin/organizations/${o.id}`}>{o.name}</Link></span>)}</span>
              : "None (individual assignment only)"] as [string, React.ReactNode]] : []),
          ]}
        />
        <ProgressSummaryPanel
          id="completion-heading"
          title="Completion progress"
          description="Overall completion across enrolled learners."
          progressLabel="Course completion"
          ariaLabel="Course completion rate"
          value={stats.completionRate}
          summary={[
            { value: stats.completed, label: "Learners completed" },
            { value: stats.inProgress, label: "Learners in progress" },
            { value: stats.notStarted, label: "Not started" },
          ]}
        />
      </div>

      {manage && <CourseVersionsTable courseId={course.id} versions={versions} />}
      <CourseEnrollmentTable enrollments={enrollments} showOrganization={scope.kind === "platform"} />
    </>
  );
}
