import { AdminShell } from "@/components/layout/admin/admin-shell";
import { adminNavigation } from "@/components/layout/admin/navigation";
import { requireAdmin } from "@/lib/auth/current-user";
import { listAdminCourses } from "@/lib/services/catalogue";
import { listLearners } from "@/lib/services/people";
import { pendingRetakes } from "@/lib/services/retakes";
import { shellSupport, shellUser } from "@/lib/services/shell";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { user, scope } = await requireAdmin();
  const [courses, learners, support, retakes] = await Promise.all([listAdminCourses(scope), listLearners(scope), shellSupport(), pendingRetakes(scope)]);
  const overdue = learners.filter((l) => l.status === "Overdue").length;
  const invited = learners.filter((l) => l.status === "Invited").length;

  return (
    <AdminShell
      user={shellUser(user)}
      scopeLabel={scope.kind === "platform" ? "Administration" : scope.organizationName}
      nav={adminNavigation.filter((item) => !item.platformOnly || scope.kind === "platform").map((item) => item.key)}
      counts={{ courses: courses.length, learners: learners.length }}
      notifications={[
        ...(retakes.length ? [{ title: `${retakes.length} retake request${retakes.length === 1 ? "" : "s"} awaiting approval`, detail: "See Dashboard → Retake requests", tone: "due" as const }] : []),
        ...(overdue ? [{ title: `${overdue} learner${overdue === 1 ? "" : "s"} with overdue training`, detail: "See Learners → Overdue", tone: "due" as const }] : []),
        ...(invited ? [{ title: `${invited} invitation${invited === 1 ? "" : "s"} not yet accepted`, detail: "See Learners → Invited", tone: "info" as const }] : []),
      ]}
      support={support}
    >
      {children}
    </AdminShell>
  );
}
