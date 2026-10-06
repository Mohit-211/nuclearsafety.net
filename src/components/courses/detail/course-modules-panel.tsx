import type { LearnerCourse } from '@/lib/types';

/** Course overview plus the module/lesson outline taken from the SCORM manifest. */
export function CourseModulesPanel({ course }: { course: LearnerCourse }) {
  return <section className="detail-panel">
    <h2>Course overview</h2>
    {course.description && <p className="course-detail-desc mt-3">{course.description}</p>}
    <p className="course-detail-desc mt-2">The course opens in the training player. Your place in the course and your results are saved as you go, so you can leave and resume at any time.</p>
    {course.modules.length > 0 && <>
      <h2 className="mt-6 mb-1">Contents</h2>
      {course.modules.map((name, i) => <div className="lesson-row" key={`${name}-${i}`}>
        <span className="detail-module-index">{i + 1}</span>
        <span className="flex-1">{name}</span>
        {course.status === 'Completed' && <span className="badge completed">Completed</span>}
      </div>)}
    </>}
  </section>;
}
