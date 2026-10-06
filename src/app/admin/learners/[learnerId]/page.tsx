import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/shared/back-link";
import { InfoPanel, ProgressSummaryPanel } from "@/components/admin/shared/detail-panels";
import { LearnerDetailHeader } from "@/components/admin/learners/learner-detail-header";
import { LearnerEnrollmentsTable } from "@/components/admin/learners/learner-enrollments-table";
import { LearnerActivityTable } from "@/components/admin/learners/learner-activity-table";
import type { AccountType } from "@/components/admin/dialogs/user-form-dialog";
import { getCurrentUser, requireAdmin } from "@/lib/auth/current-user";
import { adminScopeFor, type AdminScope } from "@/lib/auth/policy";
import { formatDate, formatRelativeDay, statusClass } from "@/lib/format";
import { pageMetadata, unavailableMetadata } from "@/lib/metadata";
import { defaultDueDate } from "@/lib/services/admin-pages";
import { assignableCourses } from "@/lib/services/catalogue";
import { organizationOptions } from "@/lib/services/organizations";
import { getLearnerDetail } from "@/lib/services/people";
import { pendingRetakes } from "@/lib/services/retakes";
import { RetakeRequestsPanel } from "@/components/admin/retakes/retake-requests-panel";

async function load(scope: AdminScope, params: Promise<{ learnerId: string }>) {
  const id = Number((await params).learnerId);
  return Number.isInteger(id) && id > 0 ? getLearnerDetail(scope, id) : null;
}

export async function generateMetadata({ params }: PageProps<"/admin/learners/[learnerId]">): Promise<Metadata> {
  const user = await getCurrentUser();
  const scope = user ? adminScopeFor(user) : null;
  const data = scope ? await load(scope, params) : null;
  return data
    ? pageMetadata(`${data.user.name} — Learner detail`, `Administration overview for the learner account of ${data.user.name}.`, { noIndex: true })
    : unavailableMetadata("Learner");
}

export default async function AdminLearnerDetailPage({ params }: PageProps<"/admin/learners/[learnerId]">) {
  const { user: me, scope } = await requireAdmin();
  const data = await load(scope, params);
  if (!data) notFound();
  const { user: learner, enrollments, activity, progress } = data;
  const isPlatform = scope.kind === "platform";
  const [courses, organizations, due, retakes] = await Promise.all([
    assignableCourses(scope), isPlatform ? organizationOptions() : Promise.resolve([]), defaultDueDate(), pendingRetakes(scope, { userId: learner.id }),
  ]);
  const count = (status: (typeof enrollments)[number]["status"]) => enrollments.filter((e) => e.status === status).length;
  const accountType: AccountType = learner.role === "platform_admin" ? "platform_admin" : learner.orgRole === "admin" ? "org_admin" : learner.organizationId ? "member" : "individual";

  return (
    <>
      <BackLink href="/admin/learners">Back to learners</BackLink>
      <LearnerDetailHeader
        learner={{
          id: learner.id, name: learner.name, email: learner.email, jobTitle: learner.jobTitle ?? "", department: learner.department ?? "",
          subtitle: [learner.email, learner.jobTitle, learner.department].filter(Boolean).join(" · "),
          statusLabel: learner.statusLabel, active: learner.status === "active", hasPassword: learner.hasPassword,
          accountType, organizationId: learner.organizationId ?? null,
        }}
        enrolled={enrollments.map((e) => ({ id: e.courseId, label: e.title, meta: e.status }))}
        courseOptions={courses.map((c) => ({ id: c.id, label: c.title, meta: c.code }))}
        organizations={organizations}
        isPlatform={isPlatform}
        isSelf={me.id === learner.id}
        defaultDueDate={due}
      />

      <div className="admin-course-grid">
        <InfoPanel
          id="learner-info-heading"
          title="Profile information"
          rows={[
            ["Account type", learner.roleLabel],
            ["Organization", learner.organizationName ?? "Individual account"],
            ["Email", learner.email],
            ["Job title", learner.jobTitle ?? "—"],
            ["Department", learner.department ?? "—"],
            ["Account created", formatDate(learner.createdAt)],
            ["Last sign-in", learner.lastLoginAt ? formatRelativeDay(learner.lastLoginAt) : "Never"],
            ["Account status", <span key="status" className={`badge ${statusClass(learner.statusLabel)}`}>{learner.statusLabel}</span>],
          ]}
        />
        <ProgressSummaryPanel
          id="learner-progress-heading"
          title="Training progress"
          description="Average progress across assigned courses."
          progressLabel="Average progress"
          ariaLabel={`${learner.name} average progress`}
          value={progress}
          summary={[
            { value: count("Completed"), label: "Courses completed" },
            { value: count("In progress"), label: "In progress" },
            { value: count("Not started"), label: "Not started" },
          ]}
        />
      </div>

      <RetakeRequestsPanel rows={retakes} showLearner={false} />
      <LearnerEnrollmentsTable enrollments={enrollments} />
      <LearnerActivityTable activity={activity} />
    </>
  );
}
