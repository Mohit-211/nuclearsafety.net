/*
 * View-model types shared by server pages and (client) components.
 * Client-safe: no server imports here.
 */

export type EnrollmentStatus = 'Not started' | 'In progress' | 'Completed';
export type ResultStatus = 'Passed' | 'Failed' | null;

/** A course as seen by the learner it is assigned to. */
export type LearnerCourse = {
  id: number;
  code: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  isMandatory: boolean;
  /** Formatted due date, e.g. "16 Oct 2026". */
  due: string | null;
  dueISO: string | null;
  daysUntilDue: number | null;
  status: EnrollmentStatus;
  /** 0–100, or null when the package does not report progress. */
  progress: number | null;
  score: number | null;
  result: ResultStatus;
  completedOn: string | null;
  lastActivity: string | null;
  lastActivityAt: number | null;
  modules: string[];
  canLaunch: boolean;
};

export type CertificateView = {
  courseId: number;
  code: string;
  title: string;
  learnerName: string;
  awardedOn: string;
  score: number | null;
};

export type LearnerActivityItem = { kind: 'started' | 'completed' | 'passed' | 'failed'; course: string; date: string };

export type CourseStatusLabel = 'Published' | 'Draft' | 'Archived';

export type AdminCourseRow = {
  id: number;
  code: string;
  title: string;
  category: string;
  enrolled: number;
  inProgress: number;
  completed: number;
  completionRate: number;
  avgProgress: number;
  status: CourseStatusLabel;
  scormVersion: string | null;
  versionNumber: number | null;
};

export type ActivityRow = {
  id: number;
  learner: string;
  action: string;
  course: string;
  date: string;
  status: 'Completed' | 'In progress' | 'Failed' | 'Info';
};

export type EnrollmentRow = {
  userId: number;
  learner: string;
  email: string;
  department: string;
  organization: string | null;
  enrolledOn: string;
  due: string | null;
  progress: number | null;
  score: number | null;
  status: EnrollmentStatus;
};

export type LearnerStatusLabel = 'Active' | 'Overdue' | 'Inactive' | 'Invited';

export type AdminLearnerRow = {
  id: number;
  name: string;
  email: string;
  department: string;
  organization: string | null;
  organizationId: number | null;
  roleLabel: string;
  courseIds: number[];
  progress: number;
  status: LearnerStatusLabel;
  lastActivity: string;
};

export type LearnerEnrollmentRow = {
  courseId: number;
  code: string;
  title: string;
  category: string;
  enrolledOn: string;
  due: string | null;
  progress: number | null;
  score: number | null;
  result: ResultStatus;
  status: EnrollmentStatus;
  completedOn: string | null;
  versionNumber: number | null;
};

export type ReportRow = {
  learner: string;
  email: string;
  department: string;
  organization: string | null;
  courseId: number;
  courseCode: string;
  course: string;
  progress: number | null;
  score: number | null;
  result: ResultStatus;
  status: EnrollmentStatus;
  /** Completion date when completed, otherwise last activity / assignment date. */
  date: string;
  daysAgo: number;
  due: string | null;
  versionNumber: number | null;
};

export type Option = { id: number; label: string; meta?: string };
