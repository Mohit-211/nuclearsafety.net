# Data model (MySQL 8)

Source of truth: `src/db/schema.ts`. Migrations: `drizzle/` (generate with `npm run db:generate`,
apply with `npm run db:migrate`; never edit an applied migration). All datetimes are UTC.

| Table | Purpose | Key constraints |
|---|---|---|
| `users` | Accounts. `role` = `platform_admin` \| `learner`; `status` active/inactive; `password_hash` null until invite accepted | unique `email` |
| `organizations` | Corporate customers; status active/inactive (inactive blocks members' sign-in) | unique `name` |
| `organization_members` | Membership + org role `member` \| `admin` (corporate admin) | unique `user_id` (one org per user) |
| `sessions` | `id` = SHA-256 of session token, `expires_at` | index user, expires |
| `password_tokens` | Reset (2 h) / invite (72 h) one-time tokens, hashed | — |
| `courses` | Logical course: code, title, description, category, duration, mandatory, status draft/published/archived, `active_version_id` | unique `code` |
| `course_versions` | Immutable uploaded package: SCORM version, schema version, launch path, SCO count, parsed manifest JSON, `storage_key` (dir under STORAGE_DIR/packages), sizes, warnings, uploader, activation | unique (course, version_number), unique storage_key |
| `organization_courses` | Courses an organization may assign | unique (org, course) |
| `assignments` | Learner ↔ course enrollment, due date, org context, assigner; soft removal `removed_at` | unique (user, course) |
| `attempts` | SCORM attempt pinned to `version_id`; normalised completion/success/score/progress/location/time + last `cmi` JSON for resume | unique (assignment, attempt_number) |
| `audit_events` | Append-only audit + activity log (actor, action, entity, subject user, course, org, metadata) | index created_at, subject, org |
| `platform_settings` | Key/value JSON settings (supportEmail, supportMessage, defaultDueDays) | PK key |

## Rules encoded in code
- Learner status = from the latest attempt of the assignment (`services/enrollments.ts#summarize`):
  Completed if `completion_status = completed` and `success_status != failed`; In progress if any commit;
  otherwise Not started.
- Completion and a pass are sticky (`cmi.ts#mergeOutcome`).
- Removing an assignment keeps its attempts; re-assigning reactivates the same row.
- New versions never change existing attempts; `courses.active_version_id` only affects new attempts.
- `courses.active_version_id` intentionally has no FK (circular reference); integrity enforced in `activateVersion`.
