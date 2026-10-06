import type { Metadata } from "next";
import { CourseList } from "@/components/courses/course-list";
import { requireUser } from "@/lib/auth/current-user";
import { pageMetadata } from "@/lib/metadata";
import { myCourses } from "@/lib/services/learner";

export const metadata: Metadata = pageMetadata(
  "Course Library",
  "Browse available nuclear safety training courses.",
);

export default async function CourseLibraryPage() {
  const user = await requireUser();
  return <CourseList courses={await myCourses(user.id)} library />;
}
