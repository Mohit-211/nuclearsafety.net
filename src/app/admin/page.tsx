import type { Metadata } from "next";
import { BookOpen, CalendarDays, CheckCircle2, TrendingUp, Users } from "lucide-react";
import { PageHeading } from "@/components/shared/page-heading";
import { StatsGrid } from "@/components/shared/stat-card";
import { CourseProgressTable } from "@/components/admin/dashboard/course-progress-table";
import { RecentActivityTable } from "@/components/admin/dashboard/recent-activity-table";
import { requireAdmin } from "@/lib/auth/current-user";
import { formatLongDate } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { adminOverview } from "@/lib/services/reports";
import { pendingRetakes } from "@/lib/services/retakes";
import { RetakeRequestsPanel } from "@/components/admin/retakes/retake-requests-panel";

export const metadata: Metadata = pageMetadata(
  "Admin Dashboard",
  "Operational overview of learners, courses and training completion.",
);

export default async function AdminDashboardPage() {
  const { scope } = await requireAdmin();
  const [overview, retakes] = await Promise.all([adminOverview(scope), pendingRetakes(scope)]);
  const where = scope.kind === "platform" ? "across the platform" : `across ${scope.organizationName}`;

  return (
    <>
      <PageHeading title="Training overview" subtitle={`A concise view of learner activity and course completion ${where}.`}>
        <div className="date-label"><CalendarDays size={15} />{formatLongDate(new Date())}</div>
      </PageHeading>
      <StatsGrid
        stats={[
          { label: "Learners in training", value: overview.totalLearners, note: "With at least one assigned course", icon: Users },
          { label: "Active courses", value: overview.activeCourses, note: scope.kind === "platform" ? "Published in the catalogue" : "Available to your organization", icon: BookOpen },
          { label: "Courses completed", value: overview.completions, note: overview.overdue ? `${overview.overdue} assignment${overview.overdue === 1 ? "" : "s"} overdue` : "Current assignments completed", icon: CheckCircle2, tone: "success" },
          { label: "Completion rate", value: `${overview.completionRate}%`, note: "Across all current assignments", icon: TrendingUp, tone: "warning" },
        ]}
      />
      <RetakeRequestsPanel rows={retakes} showOrganization={scope.kind === "platform"} />
      <div className={retakes.length ? "training-section" : undefined}><CourseProgressTable rows={overview.courses} /></div>
      <RecentActivityTable rows={overview.activity} />
    </>
  );
}
