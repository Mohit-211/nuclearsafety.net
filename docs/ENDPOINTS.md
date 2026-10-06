# Endpoint & action inventory

Auth column: **public**, **user** (any signed-in active user), **admin** (platform or corporate admin,
data scoped), **platform** (platform admin only). All implemented unless marked otherwise.

## Route handlers
| Method & path | Purpose | Auth | Notes |
|---|---|---|---|
| `POST /api/admin/packages[?courseId=N]` | Upload SCORM ZIP → validate, extract, register course (or new version) | platform | Raw body (`application/zip`), filename in `X-File-Name`. 413 too large, 422 invalid package. Returns `{ok, courseId, versionId, versionNumber, createdCourse, scormVersion, warnings}`. |
| `POST /api/attempts/[attemptId]/commit[?terminate=true]` | scorm-again `lmsCommitUrl` — persist CMI | user (attempt owner) | Same-origin check. Body `{cmi:{…}}` (JSON or text/plain beacon). Replies `{result, errorCode}`. 404 for others' attempts, 403 if assignment removed. |
| `GET/HEAD /scorm/[versionId]/[...path]` | Serve extracted package files | user with an attempt on that version, or platform | Range requests, nosniff, `frame-ancestors 'self'`. 403 unauthorised, 404 missing/traversal. |
| `GET /api/admin/reports/export` | CSV training report | admin (scoped) | UTF-8 BOM, formula-injection-safe cells. |

## Server Actions — `src/lib/actions/auth.ts`
| Action | Purpose | Auth |
|---|---|---|
| `login({email,password,remember})` | Sign in, create session; returns `redirectTo` | public (rate-limited) |
| `logout()` | Delete session, redirect `/login` | user |
| `requestPasswordReset({email})` | Email reset (or invite) link; always reports success | public (rate-limited) |
| `resetPassword({token,password,confirm})` | Set password from reset/invite token; revokes sessions | public (token) |
| `changePassword({current,password,confirm})` | Change own password; signs out other devices | user |
| `updateOwnProfile({name,jobTitle,department})` | Edit own profile (email/org are admin-managed) | user |

## Server Actions — `src/lib/actions/admin.ts`
| Action | Purpose | Auth |
|---|---|---|
| `updateCourseAction` | Edit course code/title/description/category/duration/mandatory | platform |
| `setCourseStatusAction` | draft / published / archived (publish requires active version) | platform |
| `activateVersionAction` | Make a package version active for new attempts | platform |
| `saveCourseEnrollmentAction({courseId, add, remove, dueDate})` | Assign/unassign learners to a course | admin (policy: granted course, own org members) |
| `saveLearnerEnrollmentAction({userId, add, remove, dueDate})` | Assign/unassign courses to a learner | admin (same policy) |
| `updateDueDateAction` | Change an assignment's due date | admin (scoped) — no UI yet |
| `createUserAction` | Create account + send invite. Corporate admins: forced to own org, member role | admin |
| `updateUserAction` | Edit name/email/job title/department | admin (scoped) |
| `setUserStatusAction` | Activate/deactivate (revokes sessions); not self | admin (scoped) |
| `setUserAccessAction` | Platform role, organization, org role | platform |
| `inviteUserAction` | Resend invite / send reset link | admin (scoped) |
| `createOrganizationAction` / `updateOrganizationAction` | Create / rename / (de)activate organization | platform |
| `setCourseAccessAction({organizationId, courseId, granted})` | Grant/revoke org course access | platform |
| `saveSettingsAction` | Support email/message, default due days | platform |

## Pages
Learner (`requireUser`): `/`, `/my-training`, `/course-library`, `/courses/[id]`, `/courses/[id]/play`,
`/certificates`, `/profile`, `/resources`.
Public: `/login`, `/forgot-password`, `/reset-password?token=`.
Admin (`requireAdmin`): `/admin`, `/admin/courses`, `/admin/courses/[id]` (`?edit=1` opens editor),
`/admin/learners`, `/admin/learners/[id]`, `/admin/reports`.
Platform only (`requirePlatformAdmin`): `/admin/organizations`, `/admin/organizations/[id]`, `/admin/settings`.
