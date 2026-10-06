# Progress

_Last updated: 2026-10-07_

## Completed
- **Phase 1 — Audit.** Converted Lovable UI reviewed; mock data (`src/lib/data/*`) and fake hooks
  (`use-fake-action`, `use-saved`, `use-simulated-load`) removed; every page now reads real data.
- **Phase 2 — Foundation.** `.env.example`, zod-validated env (`src/lib/env.ts`), MySQL pool +
  Drizzle schema, initial migration `drizzle/0000_init.sql`, seed-admin script, email (SMTP/console),
  login/logout, sessions, forgot/reset password, invite-based account setup, profile + password change.
- **Phase 3 — Authorization.** `policy.ts` + `current-user.ts`; scoped services; unit tests for role boundaries.
- **Phase 4 — Package ingestion.** Streaming ZIP upload route, size/file-count/zip-bomb limits,
  zip-slip/symlink/encryption rejection, manifest parsing (1.2 + 2004 detection, xml:base,
  parameters, default organization), launch file verification, atomic extraction, course + version registration.
- **Phase 5 — Course management.** Edit metadata/status (draft/published/archived), upload new
  versions, explicit version activation (existing attempts stay on their version), version list with warnings.
- **Phase 6 — Learner access.** Assignment records (soft-removable, due dates), learner dashboard,
  My courses, library, course detail, certificates — all from persisted data.
- **Phase 7 — scorm-again.** `lib/scorm/runtime.ts` adapter (1.2 `window.API`, 2004 `window.API_1484_11`),
  player shell with intro/loading/playing/closed/error states, save indicator, exit/unload handling.
- **Phase 8 — Persistence.** Commit endpoint, CMI normalisation, sticky completion/pass, score/success
  kept separate, total time, resume (`entry=resume`, suspend data, location), review mode for completed
  attempts, SCORM 2004 new-attempt rule on non-suspend exit.
- **Phase 9 — Corporate.** Organizations, memberships, corporate admins, course access grants,
  scoped learner management and assignment.
- **Phase 10 — Admin & reporting.** Platform/organization dashboards, activity feeds, reports with
  filters, CSV export (formula-injection safe), audit events, settings (support contact, default due window).
- **Phase 11 (partial).** Security headers, nginx/PM2 examples, unit tests (30), e2e smoke test (67 checks)
  run against MySQL 8.4 — all passing. See `docs/TESTING.md`.
- **Real-package verification (2026-10-07).** Both client packages (Rise, SCORM 1.2 + 2004) uploaded via
  the admin UI and played end-to-end in headless Chrome: initialise, bookmark, tab-close resume, quiz pass,
  completion, score, certificate, review mode. Findings in `docs/SCORM.md`.
- **Retakes (2026-10-07, user decision).** Completed courses are review-only; learners request a retake,
  platform/corporate admins approve or decline (dashboard + learner page), approval opens a fresh attempt;
  history and certificates kept; learner emailed. Migration `0001_retake_requests`.
- Fixes found by browser testing: React Compiler render-time crash on `/admin/courses` (enrollment
  dialog closure); login rate limiter now counts only failed attempts; favicon added.

## In progress
- Nothing mid-flight.

## Blocked
- **Production deploy** — needs VPS access, `.env` with MySQL credentials and SMTP settings.

## Pending
1. Deploy to the VPS (`docs/DEPLOYMENT.md`), run `db:migrate` + `db:seed-admin`, configure SMTP, smoke-test.
2. Manual check of the packages in Firefox/Safari/Edge and on mobile (automated run used Chrome only).
3. Decide which of the two packages to use in production (both work; 2004 additionally reports scaled score).
4. Resources page: replace placeholder entries with real documents (or remove the page).
5. Optional: PDF certificates, email notifications for assignments/due dates/new retake requests,
   multi-SCO sequencing, DB-backed rate limiting if ever clustered.

## Known limitations
- Multi-SCO packages: only the first SCO is launched (upload shows a warning).
- The final (terminate) commit is sent with `sendBeacon` (64 KB browser limit). The player commits
  synchronously before terminating when the learner uses Exit; autocommit runs every 30 s otherwise.
- Progress % is only known when the package reports `cmi.progress_measure` (SCORM 2004); otherwise
  in-progress courses show "—".
- In-memory rate limiter and content-access cache assume a single app process (PM2 `instances: 1`).
