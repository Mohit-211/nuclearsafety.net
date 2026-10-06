import type { Metadata } from "next";
import { CourseCatalogue } from "@/components/admin/courses/course-catalogue";
import { requireAdmin } from "@/lib/auth/current-user";
import { canManageCatalogue } from "@/lib/auth/policy";
import { pageMetadata } from "@/lib/metadata";
import { defaultDueDate, enrollmentMaps } from "@/lib/services/admin-pages";
import { listAdminCourses } from "@/lib/services/catalogue";
import { learnerOptions } from "@/lib/services/people";

export const metadata: Metadata = pageMetadata(
  "Courses",
  "Manage the course catalogue and learner assignments.",
);

export default async function AdminCoursesPage() {
  const { scope } = await requireAdmin();
  const [rows, learners, maps, due] = await Promise.all([listAdminCourses(scope), learnerOptions(scope), enrollmentMaps(scope), defaultDueDate()]);
  return (
    <CourseCatalogue rows={rows} canManageCatalogue={canManageCatalogue(scope)} learnerOptions={learners}
      enrolledByCourse={maps.byCourse} defaultDueDate={due} />
  );
}
