export const adminOverview = {
  totalLearners: 48,
  activeCourses: 6,
  completedCourses: 132,
  completionRate: 74,
};

export type CourseOverviewRow = {
  id: string;
  title: string;
  enrolled: number;
  inProgress: number;
  completed: number;
  avgProgress: number;
};

export const courseOverview: CourseOverviewRow[] = [
  { id: 'NS-101', title: 'Nuclear Safety Fundamentals', enrolled: 42, inProgress: 18, completed: 19, avgProgress: 68 },
  { id: 'NS-102', title: 'Radiation Protection Essentials', enrolled: 36, inProgress: 22, completed: 8, avgProgress: 41 },
  { id: 'NS-103', title: 'Safety Culture & Human Performance', enrolled: 40, inProgress: 12, completed: 6, avgProgress: 27 },
  { id: 'NS-104', title: 'Emergency Preparedness', enrolled: 38, inProgress: 9, completed: 4, avgProgress: 19 },
  { id: 'NS-100', title: 'Introduction to Nuclear Operations', enrolled: 44, inProgress: 2, completed: 41, avgProgress: 96 },
  { id: 'NS-105', title: 'Workplace Safety Awareness', enrolled: 45, inProgress: 1, completed: 43, avgProgress: 97 },
];

export type ActivityRow = {
  learner: string;
  action: string;
  course: string;
  date: string;
  status: 'Completed' | 'In progress' | 'Overdue';
};

export const recentActivity: ActivityRow[] = [
  { learner: 'Priya Sharma', action: 'Completed course', course: 'Introduction to Nuclear Operations', date: '6 Oct 2026', status: 'Completed' },
  { learner: 'Tomas Berg', action: 'Started course', course: 'Radiation Protection Essentials', date: '6 Oct 2026', status: 'In progress' },
  { learner: 'Elena Kovacs', action: 'Certificate issued', course: 'Workplace Safety Awareness', date: '5 Oct 2026', status: 'Completed' },
  { learner: 'David Okafor', action: 'Due date passed', course: 'Nuclear Safety Fundamentals', date: '5 Oct 2026', status: 'Overdue' },
  { learner: 'Maria Lindqvist', action: 'Started course', course: 'Nuclear Safety Fundamentals', date: '4 Oct 2026', status: 'In progress' },
  { learner: 'Ahmed Hassan', action: 'Completed course', course: 'Workplace Safety Awareness', date: '3 Oct 2026', status: 'Completed' },
];

export function activityStatusClass(status: string) {
  return status === 'Completed' ? 'completed' : status === 'In progress' ? 'progress' : status === 'Overdue' ? 'due' : '';
}

export type AdminCourseRow = {
  id: string;
  title: string;
  category: string;
  enrolled: number;
  completionRate: number;
  status: 'Published' | 'Draft';
};

export const adminCourses: AdminCourseRow[] = [
  { id: 'NS-101', title: 'Nuclear Safety Fundamentals', category: 'Core training', enrolled: 42, completionRate: 45, status: 'Published' },
  { id: 'NS-102', title: 'Radiation Protection Essentials', category: 'Radiation protection', enrolled: 36, completionRate: 22, status: 'Published' },
  { id: 'NS-103', title: 'Safety Culture & Human Performance', category: 'Safety culture', enrolled: 40, completionRate: 15, status: 'Draft' },
  { id: 'NS-104', title: 'Emergency Preparedness', category: 'Emergency response', enrolled: 38, completionRate: 11, status: 'Published' },
  { id: 'NS-100', title: 'Introduction to Nuclear Operations', category: 'Core training', enrolled: 44, completionRate: 93, status: 'Published' },
  { id: 'NS-105', title: 'Workplace Safety Awareness', category: 'Workplace safety', enrolled: 45, completionRate: 96, status: 'Published' },
];

export type EnrollmentRow = {
  learner: string;
  department: string;
  enrolledOn: string;
  progress: number;
  status: 'Completed' | 'In progress' | 'Not started';
};

const learnerPool = [
  { learner: 'Priya Sharma', department: 'Nuclear Operations' },
  { learner: 'Tomas Berg', department: 'Radiation Protection' },
  { learner: 'Elena Kovacs', department: 'Maintenance' },
  { learner: 'David Okafor', department: 'Operations Training' },
  { learner: 'Maria Lindqvist', department: 'Nuclear Operations' },
  { learner: 'Ahmed Hassan', department: 'Health Physics' },
  { learner: 'Sofia Marino', department: 'Emergency Planning' },
  { learner: 'James Wilson', department: 'Nuclear Operations' },
] as const;

const enrollmentDates = ['28 Aug 2026', '12 Sep 2026', '18 Sep 2026', '20 Sep 2026', '24 Sep 2026', '01 Oct 2026', '03 Oct 2026', '05 Oct 2026'];

export function courseEnrollments(courseId: string): EnrollmentRow[] {
  const course = adminCourses.find(c => c.id === courseId);
  const overview = courseOverview.find(c => c.id === courseId);
  if (!course || !overview) return [];
  const doneCount = Math.min(8, Math.max(0, Math.round(8 * course.completionRate / 100)));
  const activeCount = Math.min(8 - doneCount, Math.max(1, Math.round(8 * overview.inProgress / course.enrolled)));
  const offset = courseId.charCodeAt(3) % 8;
  return learnerPool.map((person, i) => {
    const dateIdx = (i + offset) % 8;
    if (i < doneCount) return { ...person, enrolledOn: enrollmentDates[dateIdx]!, progress: 100, status: 'Completed' as const };
    if (i < doneCount + activeCount) {
      const progress = 20 + ((i * 17 + courseId.charCodeAt(3)) % 61);
      return { ...person, enrolledOn: enrollmentDates[dateIdx]!, progress, status: 'In progress' as const };
    }
    return { ...person, enrolledOn: enrollmentDates[dateIdx]!, progress: 0, status: 'Not started' as const };
  });
}

export function enrollmentStatusClass(status: EnrollmentRow['status']) {
  return status === 'Completed' ? 'completed' : status === 'In progress' ? 'progress' : '';
}

export type AdminLearnerRow = {
  id: string;
  name: string;
  email: string;
  department: string;
  courseIds: string[];
  progress: number;
  status: 'Active' | 'Overdue' | 'Inactive';
  lastActivity: string;
};

export const adminLearners: AdminLearnerRow[] = [
  { id: 'L-01', name: 'James Wilson', email: 'james.wilson@nuclearsafety.net', department: 'Nuclear Operations', courseIds: ['NS-101', 'NS-102'], progress: 65, status: 'Active', lastActivity: 'Today' },
  { id: 'L-02', name: 'Priya Sharma', email: 'priya.sharma@nuclearsafety.net', department: 'Nuclear Operations', courseIds: ['NS-100', 'NS-105', 'NS-101'], progress: 92, status: 'Active', lastActivity: 'Today' },
  { id: 'L-03', name: 'Tomas Berg', email: 'tomas.berg@nuclearsafety.net', department: 'Radiation Protection', courseIds: ['NS-102', 'NS-104'], progress: 41, status: 'Active', lastActivity: 'Yesterday' },
  { id: 'L-04', name: 'David Okafor', email: 'david.okafor@nuclearsafety.net', department: 'Operations Training', courseIds: ['NS-101', 'NS-103'], progress: 24, status: 'Overdue', lastActivity: '5 Oct 2026' },
  { id: 'L-05', name: 'Elena Kovacs', email: 'elena.kovacs@nuclearsafety.net', department: 'Maintenance', courseIds: ['NS-105', 'NS-100'], progress: 100, status: 'Active', lastActivity: '5 Oct 2026' },
  { id: 'L-06', name: 'Maria Lindqvist', email: 'maria.lindqvist@nuclearsafety.net', department: 'Nuclear Operations', courseIds: ['NS-101', 'NS-104'], progress: 18, status: 'Active', lastActivity: '4 Oct 2026' },
  { id: 'L-07', name: 'Ahmed Hassan', email: 'ahmed.hassan@nuclearsafety.net', department: 'Health Physics', courseIds: ['NS-102', 'NS-105'], progress: 87, status: 'Active', lastActivity: '3 Oct 2026' },
  { id: 'L-08', name: 'Sofia Marino', email: 'sofia.marino@nuclearsafety.net', department: 'Emergency Planning', courseIds: ['NS-104'], progress: 0, status: 'Inactive', lastActivity: '22 Sep 2026' },
  { id: 'L-09', name: 'Peter Novak', email: 'peter.novak@nuclearsafety.net', department: 'Maintenance', courseIds: ['NS-100', 'NS-103'], progress: 33, status: 'Overdue', lastActivity: '28 Sep 2026' },
];

export function learnerStatusClass(status: AdminLearnerRow['status']) {
  return status === 'Active' ? 'completed' : status === 'Overdue' ? 'due' : '';
}

export type LearnerEnrollmentRow = {
  courseId: string;
  title: string;
  category: string;
  enrolledOn: string;
  progress: number;
  status: 'Completed' | 'In progress' | 'Not started';
  completedOn?: string;
};

export function learnerEnrollments(learnerId: string): LearnerEnrollmentRow[] {
  const learner = adminLearners.find(l => l.id === learnerId);
  if (!learner) return [];
  const offset = learnerId.charCodeAt(3);
  const total = learner.courseIds.length;
  // Completed courses hold 100%; a single in-progress course carries the
  // remainder so the per-course values average back to the learner's progress.
  const completedCount = Math.floor(total * learner.progress / 100);
  const remainingUnits = total - completedCount;
  const inProgressCount = learner.progress > 0 ? Math.min(1, remainingUnits) : 0;
  const activeProgress = inProgressCount > 0
    ? Math.min(99, Math.max(5, Math.round(learner.progress * total - 100 * completedCount)))
    : 0;
  return learner.courseIds.map((courseId, i) => {
    const course = adminCourses.find(c => c.id === courseId);
    const enrolledOn = enrollmentDates[(offset + i) % enrollmentDates.length]!;
    const status = i < completedCount
      ? 'Completed' as const
      : i < completedCount + inProgressCount
        ? 'In progress' as const
        : 'Not started' as const;
    const progress = status === 'Completed' ? 100 : status === 'In progress' ? activeProgress : 0;
    const completedOn = status === 'Completed'
      ? enrollmentDates[Math.min((offset + i) % enrollmentDates.length + 2, enrollmentDates.length - 1)]!
      : undefined;
    return {
      courseId,
      title: course?.title ?? courseId,
      category: course?.category ?? '—',
      enrolledOn,
      progress,
      status,
      ...(completedOn !== undefined ? { completedOn } : {}),
    };
  });
}

export type LearnerActivityRow = {
  action: string;
  course: string;
  date: string;
  status: 'Completed' | 'In progress' | 'Overdue';
};

const activityTemplates: Array<Omit<LearnerActivityRow, 'course'>> = [
  { action: 'Completed module', date: '6 Oct 2026', status: 'In progress' },
  { action: 'Completed course', date: '3 Oct 2026', status: 'Completed' },
  { action: 'Started course', date: '1 Oct 2026', status: 'In progress' },
  { action: 'Certificate issued', date: '3 Oct 2026', status: 'Completed' },
  { action: 'Due date passed', date: '29 Sep 2026', status: 'Overdue' },
  { action: 'Logged in', date: '6 Oct 2026', status: 'In progress' },
];

export function learnerActivity(learnerId: string): LearnerActivityRow[] {
  const learner = adminLearners.find(l => l.id === learnerId);
  if (!learner || learner.courseIds.length === 0) return [];
  const recent = learner.status === 'Overdue'
    ? [...activityTemplates.slice(0, 3), activityTemplates[4]!]
    : activityTemplates.slice(0, 4);
  const offset = learnerId.charCodeAt(3);
  return recent.map((template, i) => {
    const courseId = learner.courseIds[(offset + i) % learner.courseIds.length]!;
    const course = adminCourses.find(c => c.id === courseId);
    return { ...template, course: course?.title ?? courseId };
  });
}

export type ReportRow = {
  learner: string;
  department: string;
  courseId: string;
  course: string;
  progress: number;
  score?: number;
  status: 'Completed' | 'In progress' | 'Not started';
  date: string;
  daysAgo: number;
};

// Training report rows — completion dates for finished courses, last-activity
// dates otherwise. `daysAgo` counts back from 6 Oct 2026 for date filtering.
export const reportRows: ReportRow[] = [
  { learner: 'Priya Sharma', department: 'Nuclear Operations', courseId: 'NS-100', course: 'Introduction to Nuclear Operations', progress: 100, score: 96, status: 'Completed', date: '06 Oct 2026', daysAgo: 0 },
  { learner: 'Priya Sharma', department: 'Nuclear Operations', courseId: 'NS-101', course: 'Nuclear Safety Fundamentals', progress: 68, status: 'In progress', date: '06 Oct 2026', daysAgo: 0 },
  { learner: 'Priya Sharma', department: 'Nuclear Operations', courseId: 'NS-105', course: 'Workplace Safety Awareness', progress: 100, score: 94, status: 'Completed', date: '02 Oct 2026', daysAgo: 4 },
  { learner: 'Elena Kovacs', department: 'Maintenance', courseId: 'NS-105', course: 'Workplace Safety Awareness', progress: 100, score: 91, status: 'Completed', date: '05 Oct 2026', daysAgo: 1 },
  { learner: 'Elena Kovacs', department: 'Maintenance', courseId: 'NS-100', course: 'Introduction to Nuclear Operations', progress: 100, score: 97, status: 'Completed', date: '28 Sep 2026', daysAgo: 8 },
  { learner: 'Ahmed Hassan', department: 'Health Physics', courseId: 'NS-105', course: 'Workplace Safety Awareness', progress: 100, score: 89, status: 'Completed', date: '30 Sep 2026', daysAgo: 6 },
  { learner: 'Ahmed Hassan', department: 'Health Physics', courseId: 'NS-102', course: 'Radiation Protection Essentials', progress: 74, status: 'In progress', date: '05 Oct 2026', daysAgo: 1 },
  { learner: 'James Wilson', department: 'Nuclear Operations', courseId: 'NS-101', course: 'Nuclear Safety Fundamentals', progress: 65, status: 'In progress', date: '06 Oct 2026', daysAgo: 0 },
  { learner: 'James Wilson', department: 'Nuclear Operations', courseId: 'NS-102', course: 'Radiation Protection Essentials', progress: 0, status: 'Not started', date: '12 Sep 2026', daysAgo: 24 },
  { learner: 'Tomas Berg', department: 'Radiation Protection', courseId: 'NS-102', course: 'Radiation Protection Essentials', progress: 41, status: 'In progress', date: '05 Oct 2026', daysAgo: 1 },
  { learner: 'Tomas Berg', department: 'Radiation Protection', courseId: 'NS-104', course: 'Emergency Preparedness', progress: 0, status: 'Not started', date: '18 Sep 2026', daysAgo: 18 },
  { learner: 'David Okafor', department: 'Operations Training', courseId: 'NS-101', course: 'Nuclear Safety Fundamentals', progress: 24, status: 'In progress', date: '30 Sep 2026', daysAgo: 6 },
  { learner: 'Maria Lindqvist', department: 'Nuclear Operations', courseId: 'NS-101', course: 'Nuclear Safety Fundamentals', progress: 18, status: 'In progress', date: '04 Oct 2026', daysAgo: 2 },
  { learner: 'Maria Lindqvist', department: 'Nuclear Operations', courseId: 'NS-104', course: 'Emergency Preparedness', progress: 0, status: 'Not started', date: '24 Sep 2026', daysAgo: 12 },
  { learner: 'Sofia Marino', department: 'Emergency Planning', courseId: 'NS-104', course: 'Emergency Preparedness', progress: 0, status: 'Not started', date: '22 Sep 2026', daysAgo: 14 },
  { learner: 'Peter Novak', department: 'Maintenance', courseId: 'NS-100', course: 'Introduction to Nuclear Operations', progress: 100, score: 84, status: 'Completed', date: '24 Sep 2026', daysAgo: 12 },
  { learner: 'Peter Novak', department: 'Maintenance', courseId: 'NS-103', course: 'Safety Culture & Human Performance', progress: 33, status: 'In progress', date: '28 Sep 2026', daysAgo: 8 },
];

export function reportStatusClass(status: ReportRow['status']) {
  return status === 'Completed' ? 'completed' : status === 'In progress' ? 'progress' : '';
}
