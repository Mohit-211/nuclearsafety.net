import { sql } from 'drizzle-orm';
import {
  bigint, boolean, char, date, datetime, double, index, int, json, longtext, mysqlEnum, mysqlTable,
  text, uniqueIndex, varchar,
} from 'drizzle-orm/mysql-core';

/*
 * MySQL schema. Conventions:
 * - Integer auto-increment primary keys; foreign keys use `int` + references().
 * - Timestamps are UTC `datetime` columns (the pool is configured with timezone 'Z').
 * - Nothing that feeds historical reporting is hard-deleted: users/courses are
 *   deactivated/archived, assignments are soft-removed, attempts are never deleted.
 */

const createdAt = () => datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`);
const updatedAt = () => datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => new Date());

/** Platform-level role. Corporate administration is expressed through organization_members.role. */
export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 160 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  role: mysqlEnum('role', ['platform_admin', 'learner']).notNull().default('learner'),
  status: mysqlEnum('status', ['active', 'inactive']).notNull().default('active'),
  jobTitle: varchar('job_title', { length: 160 }),
  department: varchar('department', { length: 160 }),
  passwordChangedAt: datetime('password_changed_at'),
  lastLoginAt: datetime('last_login_at'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [uniqueIndex('users_email_uq').on(t.email)]);

export const organizations = mysqlTable('organizations', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  status: mysqlEnum('status', ['active', 'inactive']).notNull().default('active'),
  createdBy: int('created_by').references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [uniqueIndex('organizations_name_uq').on(t.name)]);

/** A user belongs to at most one organization (unique user_id). No row = individual account. */
export const organizationMembers = mysqlTable('organization_members', {
  id: int('id').autoincrement().primaryKey(),
  organizationId: int('organization_id').notNull().references(() => organizations.id),
  userId: int('user_id').notNull().references(() => users.id),
  role: mysqlEnum('role', ['member', 'admin']).notNull().default('member'),
  createdAt: createdAt(),
}, t => [
  uniqueIndex('org_members_user_uq').on(t.userId),
  index('org_members_org_idx').on(t.organizationId),
]);

export const sessions = mysqlTable('sessions', {
  /** SHA-256 (hex) of the session token; the raw token only lives in the cookie. */
  id: char('id', { length: 64 }).primaryKey(),
  userId: int('user_id').notNull().references(() => users.id),
  expiresAt: datetime('expires_at').notNull(),
  userAgent: varchar('user_agent', { length: 255 }),
  ip: varchar('ip', { length: 64 }),
  createdAt: createdAt(),
}, t => [index('sessions_user_idx').on(t.userId), index('sessions_expires_idx').on(t.expiresAt)]);

/** One-time tokens for password reset and account invites (hash stored, never the raw token). */
export const passwordTokens = mysqlTable('password_tokens', {
  id: char('id', { length: 64 }).primaryKey(),
  userId: int('user_id').notNull().references(() => users.id),
  purpose: mysqlEnum('purpose', ['reset', 'invite']).notNull(),
  expiresAt: datetime('expires_at').notNull(),
  usedAt: datetime('used_at'),
  createdAt: createdAt(),
}, t => [index('password_tokens_user_idx').on(t.userId)]);

export const courses = mysqlTable('courses', {
  id: int('id').autoincrement().primaryKey(),
  /** Short human-facing code, e.g. "NS-101". */
  code: varchar('code', { length: 40 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 120 }),
  /** Free-text estimate shown to learners, e.g. "45 min". */
  estimatedDuration: varchar('estimated_duration', { length: 40 }),
  isMandatory: boolean('is_mandatory').notNull().default(false),
  status: mysqlEnum('status', ['draft', 'published', 'archived']).notNull().default('draft'),
  /** Package version used for NEW attempts. Existing attempts keep their own version. */
  activeVersionId: int('active_version_id'),
  createdBy: int('created_by').references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [uniqueIndex('courses_code_uq').on(t.code), index('courses_status_idx').on(t.status)]);

/** An uploaded, validated and extracted SCORM package. Immutable once created. */
export const courseVersions = mysqlTable('course_versions', {
  id: int('id').autoincrement().primaryKey(),
  courseId: int('course_id').notNull().references(() => courses.id),
  versionNumber: int('version_number').notNull(),
  scormVersion: mysqlEnum('scorm_version', ['1.2', '2004']).notNull(),
  /** Raw <schemaversion> from the manifest, e.g. "1.2", "CAM 1.3", "2004 4th Edition". */
  schemaVersion: varchar('schema_version', { length: 60 }),
  manifestIdentifier: varchar('manifest_identifier', { length: 255 }),
  manifestTitle: varchar('manifest_title', { length: 255 }),
  /** Launch href relative to the package root (may include a query string). */
  launchPath: varchar('launch_path', { length: 1024 }).notNull(),
  scoCount: int('sco_count').notNull(),
  /** Parsed organization/items/resources summary (see lib/scorm/manifest.ts PackageInfo). */
  manifest: json('manifest').notNull(),
  /** Directory name under STORAGE_DIR/packages. Never exposed to the browser. */
  storageKey: varchar('storage_key', { length: 64 }).notNull(),
  originalFilename: varchar('original_filename', { length: 255 }),
  zipSizeBytes: bigint('zip_size_bytes', { mode: 'number' }).notNull(),
  fileCount: int('file_count').notNull(),
  uncompressedBytes: bigint('uncompressed_bytes', { mode: 'number' }).notNull(),
  warnings: json('warnings'),
  status: mysqlEnum('status', ['ready', 'archived']).notNull().default('ready'),
  uploadedBy: int('uploaded_by').references(() => users.id),
  uploadedAt: createdAt(),
  activatedAt: datetime('activated_at'),
  activatedBy: int('activated_by').references(() => users.id),
}, t => [
  uniqueIndex('course_versions_course_num_uq').on(t.courseId, t.versionNumber),
  uniqueIndex('course_versions_storage_uq').on(t.storageKey),
]);

/** Which courses an organization may assign to its members. */
export const organizationCourses = mysqlTable('organization_courses', {
  id: int('id').autoincrement().primaryKey(),
  organizationId: int('organization_id').notNull().references(() => organizations.id),
  courseId: int('course_id').notNull().references(() => courses.id),
  grantedBy: int('granted_by').references(() => users.id),
  createdAt: createdAt(),
}, t => [uniqueIndex('org_courses_uq').on(t.organizationId, t.courseId), index('org_courses_course_idx').on(t.courseId)]);

/**
 * A learner's enrollment in a course. One row per (user, course); removal is a soft
 * delete (removed_at) so history and attempts survive, and re-assigning reactivates it.
 */
export const assignments = mysqlTable('assignments', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull().references(() => users.id),
  courseId: int('course_id').notNull().references(() => courses.id),
  /** Organization context at assignment time (null for individual learners). */
  organizationId: int('organization_id').references(() => organizations.id),
  assignedBy: int('assigned_by').references(() => users.id),
  dueDate: date('due_date', { mode: 'string' }),
  assignedAt: datetime('assigned_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  removedAt: datetime('removed_at'),
  removedBy: int('removed_by').references(() => users.id),
}, t => [
  uniqueIndex('assignments_user_course_uq').on(t.userId, t.courseId),
  index('assignments_course_idx').on(t.courseId),
  index('assignments_org_idx').on(t.organizationId),
]);

/**
 * A SCORM attempt: pinned to the package version it started on. Normalised columns
 * feed reporting; `cmi` holds the last committed CMI tree used to resume.
 */
export const attempts = mysqlTable('attempts', {
  id: int('id').autoincrement().primaryKey(),
  assignmentId: int('assignment_id').notNull().references(() => assignments.id),
  userId: int('user_id').notNull().references(() => users.id),
  courseId: int('course_id').notNull().references(() => courses.id),
  versionId: int('version_id').notNull().references(() => courseVersions.id),
  attemptNumber: int('attempt_number').notNull(),
  /** not attempted | incomplete | completed | unknown (1.2 lesson_status is mapped onto this). */
  completionStatus: varchar('completion_status', { length: 20 }).notNull().default('not attempted'),
  /** passed | failed | unknown */
  successStatus: varchar('success_status', { length: 20 }).notNull().default('unknown'),
  scoreRaw: double('score_raw'),
  scoreMin: double('score_min'),
  scoreMax: double('score_max'),
  scoreScaled: double('score_scaled'),
  progressMeasure: double('progress_measure'),
  location: varchar('location', { length: 1000 }),
  /** Accumulated total time in seconds, as reported by the runtime on terminate. */
  totalTimeSeconds: int('total_time_seconds').notNull().default(0),
  /** Raw total_time string in the package's own format, re-supplied on resume. */
  totalTimeRaw: varchar('total_time_raw', { length: 40 }),
  lastExit: varchar('last_exit', { length: 20 }),
  cmi: longtext('cmi'),
  commitCount: int('commit_count').notNull().default(0),
  startedAt: datetime('started_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  lastCommitAt: datetime('last_commit_at'),
  completedAt: datetime('completed_at'),
  terminatedAt: datetime('terminated_at'),
}, t => [
  uniqueIndex('attempts_assignment_num_uq').on(t.assignmentId, t.attemptNumber),
  index('attempts_user_course_idx').on(t.userId, t.courseId),
  index('attempts_version_idx').on(t.versionId),
]);

/** Append-only audit / activity log. */
export const auditEvents = mysqlTable('audit_events', {
  id: bigint('id', { mode: 'number' }).autoincrement().primaryKey(),
  actorId: int('actor_id').references(() => users.id),
  action: varchar('action', { length: 80 }).notNull(),
  entityType: varchar('entity_type', { length: 40 }).notNull(),
  entityId: int('entity_id'),
  /** Learner the event concerns (for activity feeds), when applicable. */
  subjectUserId: int('subject_user_id').references(() => users.id),
  courseId: int('course_id').references(() => courses.id),
  organizationId: int('organization_id').references(() => organizations.id),
  metadata: json('metadata'),
  createdAt: createdAt(),
}, t => [
  index('audit_created_idx').on(t.createdAt),
  index('audit_subject_idx').on(t.subjectUserId, t.createdAt),
  index('audit_org_idx').on(t.organizationId, t.createdAt),
]);

/** Small key/value store for platform settings (see lib/services/settings.ts). */
export const platformSettings = mysqlTable('platform_settings', {
  key: varchar('key', { length: 80 }).primaryKey(),
  value: json('value').notNull(),
  updatedBy: int('updated_by').references(() => users.id),
  updatedAt: updatedAt(),
});

export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type CourseVersion = typeof courseVersions.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
