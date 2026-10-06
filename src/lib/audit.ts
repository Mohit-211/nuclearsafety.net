import 'server-only';
import { db, schema, type Database } from '@/db';

/** Activity/audit actions. Learner-facing activity feeds read the `learner.*` ones. */
export type AuditAction =
  | 'auth.login' | 'auth.password_reset' | 'auth.password_changed'
  | 'user.created' | 'user.updated' | 'user.invited' | 'user.status_changed' | 'user.role_changed'
  | 'organization.created' | 'organization.updated' | 'organization.member_added' | 'organization.member_role_changed'
  | 'organization.course_granted' | 'organization.course_revoked'
  | 'course.created' | 'course.updated' | 'course.status_changed'
  | 'course_version.uploaded' | 'course_version.activated'
  | 'assignment.created' | 'assignment.removed' | 'assignment.updated'
  | 'learner.course_started' | 'learner.course_completed' | 'learner.course_passed' | 'learner.course_failed'
  | 'retake.requested' | 'retake.approved' | 'retake.declined'
  | 'settings.updated';

export type AuditInput = {
  actorId: number | null;
  action: AuditAction;
  entityType: 'user' | 'organization' | 'course' | 'course_version' | 'assignment' | 'attempt' | 'retake_request' | 'settings' | 'session';
  entityId?: number | null;
  subjectUserId?: number | null;
  courseId?: number | null;
  organizationId?: number | null;
  metadata?: Record<string, unknown>;
};

/** Append an audit event. Pass a transaction handle to make it part of the same unit of work. */
export async function audit(event: AuditInput, tx: Pick<Database, 'insert'> = db()) {
  await tx.insert(schema.auditEvents).values({
    actorId: event.actorId,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId ?? null,
    subjectUserId: event.subjectUserId ?? null,
    courseId: event.courseId ?? null,
    organizationId: event.organizationId ?? null,
    metadata: event.metadata ?? null,
  });
}
