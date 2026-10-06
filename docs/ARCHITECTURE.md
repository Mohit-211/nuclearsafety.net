# Architecture

One Next.js 16 application (App Router) serves the UI, the server logic (Server Components,
Server Actions, Route Handlers) and the SCORM content. MySQL 8 is the only datastore; extracted
SCORM packages live on the server filesystem under `STORAGE_DIR`. Nginx terminates TLS and proxies
to a single PM2-managed `next start` process.

```
Browser ──HTTPS──▶ Nginx ──▶ next start (PM2, 1 instance)
                               ├─ Pages (RSC)        → services → MySQL
                               ├─ Server Actions     → services → MySQL (+ audit_events)
                               ├─ /api/admin/packages  ZIP → STORAGE_DIR/tmp → validate → extract → STORAGE_DIR/packages/<uuid>
                               ├─ /scorm/<versionId>/… authorised static serving of package files (Range support)
                               └─ /api/attempts/<id>/commit  scorm-again commits → attempts table
```

## Layers
| Layer | Location | Notes |
|---|---|---|
| Presentation | `src/app/**`, `src/components/**` | Converted Lovable UI. Server pages fetch data and pass view models (`src/lib/types.ts`) to client components. |
| Actions / routes | `src/lib/actions/*`, `src/app/api/**`, `src/app/scorm/**` | Validate input (zod), authenticate (`assert*`), call services, return `ActionResult`. |
| Authorization | `src/lib/auth/policy.ts` | Pure functions: `adminScopeFor`, `canManageUser`, `canAssignCourse`, `canManageCatalogue`, `canChangeRoles`. Unit tested. |
| Domain + data access | `src/lib/services/*` | Server-only. Every admin query is filtered by `AdminScope`. |
| SCORM | `src/lib/scorm/*` | Manifest parsing, ZIP safety, ingestion, CMI mapping (server) and the browser runtime adapter. |
| Persistence | `src/db/schema.ts`, `drizzle/` | Drizzle ORM schema + SQL migrations. |

## Roles and scopes
- **Platform admin** (`users.role = platform_admin`) → `AdminScope { kind: 'platform' }`: everything.
- **Corporate admin** (`organization_members.role = admin`) → `{ kind: 'organization', organizationId }`:
  only their organization's learners, only courses granted to the organization, scoped reports.
  Cannot upload packages, manage organizations/roles, or change settings.
- **Learner** (everyone, including admins, for their own assignments): only their own assigned,
  published courses, attempts and certificates.
- Individual learners = users with no organization membership.

Both admin kinds use the same `/admin` console; navigation and data are filtered by scope
(no second admin application).

## Authentication
Custom, in-app: email + password (Node `scrypt`), DB-backed sessions (`sessions` table stores the
SHA-256 of a random 256-bit token; cookie `ns_session`, httpOnly, SameSite=Lax, Secure in production).
"Remember me" = 30-day persistent cookie, otherwise 12-hour browser-session cookie. Password reset and
account invites use one-time hashed tokens (`password_tokens`, 2 h / 72 h) emailed via SMTP
(nodemailer) — printed to the server console when SMTP is not configured. Password change/reset
revokes other sessions; deactivation revokes all sessions. Accounts are admin-created only
(no public sign-up — decision 2026-10-07). Login and reset are rate-limited in memory (per IP and per email).

## SCORM content serving and isolation
Content is served from the **same origin** under `/scorm/<versionId>/…` because SCORM content locates
the API by walking `window.parent` (cross-origin frames cannot do that without modifying the package).
Consequence: package JavaScript runs with the platform's origin. Mitigations: only platform admins can
upload packages; files are served only to signed-in users with an attempt on that version (or platform
admins); responses carry `X-Content-Type-Options: nosniff`, `frame-ancestors 'self'`; nothing under
`STORAGE_DIR` is otherwise reachable. If untrusted third-party packages ever need to be supported,
move content to a separate origin and use scorm-again's cross-frame API (see `docs/SCORM.md`).

## Deviations from the blueprint
- None in technology. Notable product decisions: admin-created accounts only; a user belongs to at
  most one organization; certificates are an on-screen/printable record (no PDF generation);
  only the first SCO of multi-SCO packages is launched (sequencing not implemented — the supplied
  Rise-style packages are single-SCO).
- Mock UI controls without backing behaviour were removed rather than faked: learner notification
  preferences, admin 2FA toggle, pass-mark / auto-assign / certificate-expiry settings, language/time
  zone selects. The Resources page is still static placeholder content.
