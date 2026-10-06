import type { Metadata } from "next";
import { CourseList } from "@/components/courses/course-list";
import { requireUser } from "@/lib/auth/current-user";
import { pageMetadata } from "@/lib/metadata";
import { myCourses } from "@/lib/services/learner";

export const metadata: Metadata = pageMetadata(
  "My Courses",
  "View your assigned nuclear safety training and course progress.",
);

export default async function MyTrainingPage() {
  const user = await requireUser();
  return <CourseList courses={await myCourses(user.id)} />;
}
