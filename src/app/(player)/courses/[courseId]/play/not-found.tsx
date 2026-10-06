import { CourseUnavailable } from "@/components/courses/course-unavailable";

export default function PlayerNotFound() {
  return (
    <div className="player-page">
      <main className="player-stage">
        <CourseUnavailable />
      </main>
    </div>
  );
}
