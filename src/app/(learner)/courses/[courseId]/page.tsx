import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/shared/back-link";
import { CourseHero } from "@/components/courses/detail/course-hero";
import { CourseModulesPanel } from "@/components/courses/detail/course-modules-panel";
import { CourseSidebar } from "@/components/courses/detail/course-sidebar";
import { getCurrentUser, requireUser } from "@/lib/auth/current-user";
import { pageMetadata, unavailableMetadata } from "@/lib/metadata";
import { myCourse } from "@/lib/services/learner";

async function load(params: Promise<{ courseId: string }>, userId: number) {
  const id = Number((await params).courseId);
  return Number.isInteger(id) && id > 0 ? myCourse(userId, id) : null;
}

export async function generateMetadata({ params }: PageProps<"/courses/[courseId]">): Promise<Metadata> {
  const user = await getCurrentUser();
  const course = user ? await load(params, user.id) : null;
  return course ? pageMetadata(course.title, course.description || course.title) : unavailableMetadata("Course");
}

export default async function CourseDetailPage({ params }: PageProps<"/courses/[courseId]">) {
  const user = await requireUser();
  const course = await load(params, user.id);
  if (!course) notFound();

  return (
    <>
      <BackLink href="/my-training">Back to my courses</BackLink>
      <CourseHero course={course} />
      <div className="course-detail-grid">
        <CourseModulesPanel course={course} />
        <CourseSidebar course={course} />
      </div>
    </>
  );
}
