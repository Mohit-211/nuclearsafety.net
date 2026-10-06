import { AppShell } from "@/components/layout/learner/app-shell";
import { requireUser } from "@/lib/auth/current-user";
import { myCourses } from "@/lib/services/learner";
import { learnerNotifications, shellSupport, shellUser } from "@/lib/services/shell";

export default async function LearnerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const [courses, support] = await Promise.all([myCourses(user.id), shellSupport()]);
  return (
    <AppShell user={shellUser(user)} notifications={learnerNotifications(courses)} support={support}>
      {children}
    </AppShell>
  );
}
