import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CoursePlayer } from "@/components/courses/player/course-player";
import { CourseUnavailable } from "@/components/courses/course-unavailable";
import type { PlayerPhase } from "@/components/courses/player/types";
import { getCurrentUser, requireUser } from "@/lib/auth/current-user";
import { pageMetadata, unavailableMetadata } from "@/lib/metadata";
import { launchCourse, LaunchError } from "@/lib/services/attempts";
import { myCourse } from "@/lib/services/learner";

export const dynamic = "force-dynamic";

const courseIdOf = async (params: Promise<{ courseId: string }>) => {
  const id = Number((await params).courseId);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function generateMetadata({ params }: PageProps<"/courses/[courseId]/play">): Promise<Metadata> {
  const user = await getCurrentUser();
  const id = await courseIdOf(params);
  const course = user && id ? await myCourse(user.id, id) : null;
  return course
    ? pageMetadata(`Training player — ${course.title}`, `Course player for ${course.title}.`, { noIndex: true })
    : unavailableMetadata("Course");
}

export default async function CoursePlayerPage({ params }: PageProps<"/courses/[courseId]/play">) {
  const user = await requireUser();
  const id = await courseIdOf(params);
  const course = id ? await myCourse(user.id, id) : null;
  if (!course) notFound();

  let launch;
  try {
    launch = await launchCourse(user, course.id);
  } catch (err) {
    if (!(err instanceof LaunchError)) throw err;
    return (
      <div className="player-page">
        <main className="player-stage"><CourseUnavailable message={err.message} /></main>
      </div>
    );
  }

  const phase: PlayerPhase = course.status === "Completed" ? "completed" : course.status === "In progress" ? "in-progress" : "not-started";
  return (
    <CoursePlayer
      course={{ id: course.id, code: course.code, title: course.title, category: course.category, duration: course.duration, moduleCount: course.modules.length }}
      launch={{ ...launch, phase, progress: course.progress }}
    />
  );
}
