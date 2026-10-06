import type { Metadata } from "next";
import { Award, BookOpen, CalendarDays, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { PageHeading } from "@/components/shared/page-heading";
import { SampleNote } from "@/components/shared/sample-note";
import { StatsGrid } from "@/components/shared/stat-card";
import { AssignedTraining } from "@/components/dashboard/assigned-training";
import { ContinueLearning } from "@/components/dashboard/continue-learning";
import { HelpPanel } from "@/components/dashboard/help-panel";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { UpcomingDeadlines } from "@/components/dashboard/upcoming-deadlines";
import { requireUser } from "@/lib/auth/current-user";
import { formatLongDate } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { myCertificates, myCourses, myRecentActivity } from "@/lib/services/learner";

export const metadata: Metadata = pageMetadata(
  "Learner Dashboard",
  "Your nuclear safety training, course progress, and upcoming deadlines.",
  { ogDescription: "Your nuclear safety learning workspace." },
);

export default async function DashboardPage() {
  const user = await requireUser();
  const [courses, certificates, activity] = await Promise.all([myCourses(user.id), myCertificates(user), myRecentActivity(user.id)]);
  const count = (status: string) => courses.filter((c) => c.status === status).length;
  const firstName = user.name.split(/\s+/)[0];

  return (
    <>
      <PageHeading title={`Welcome back, ${firstName}`} subtitle="Here’s an overview of your learning and upcoming training.">
        <div className="date-label">
          <CalendarDays size={15} />
          {formatLongDate(new Date())}
        </div>
      </PageHeading>
      <StatsGrid
        stats={[
          { label: "Assigned courses", value: courses.length, note: "Your current learning plan", icon: BookOpen },
          { label: "In progress", value: count("In progress"), note: "Keep your learning moving", icon: Clock3 },
          { label: "Completed", value: count("Completed"), note: "Courses successfully completed", icon: CheckCircle2, tone: "success" },
          { label: "Certificates earned", value: certificates.length, note: "Available to view and print", icon: Award, tone: "warning" },
        ]}
      />
      <div className="dashboard-grid">
        <div>
          <ContinueLearning courses={courses} />
          <AssignedTraining courses={courses} />
          <SampleNote icon={ShieldCheck}>
            Stay on track. Complete your assigned courses before their due dates.
          </SampleNote>
        </div>
        <aside className="dashboard-aside">
          <UpcomingDeadlines courses={courses} />
          <RecentActivity activity={activity} />
          <HelpPanel />
        </aside>
      </div>
    </>
  );
}
