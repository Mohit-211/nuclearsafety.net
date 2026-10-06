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
- **Phase 11 (partial).** Security headers, nginx/PM2 examples, unit tests (28), e2e smoke test (60 checks)
  run against MySQL 8.4 — all passing. See `docs/TESTING.md`.

## In progress
- Nothing mid-flight.

## Blocked
- **Real-package verification** — waiting for the client's SCORM 1.2 and SCORM 2004 packages
  (user will place them in Downloads). Needed to confirm launch path, resume behaviour of
  `scormdriver`/`AutoBookmark.js`, completion/score reporting and `CourseExit.js` behaviour in a browser.
- **Production deploy** — needs VPS access, `.env` with MySQL credentials and SMTP settings.

## Pending
1. Upload both supplied packages, play them in Chrome/Firefox/Safari/Edge, verify: initialise, commit,
   suspend/resume, completion, score, exit button, closing the tab mid-course. Record findings in `docs/SCORM.md`.
2. Deploy to the VPS (`docs/DEPLOYMENT.md`), run `db:migrate` + `db:seed-admin`, configure SMTP, smoke-test.
3. Decide whether learners need a "start a new attempt / retake" action after completion.
4. Resources page: replace placeholder entries with real documents (or remove the page).
5. Optional: PDF certificates, email notifications for assignments/due dates, multi-SCO sequencing,
   per-organization reporting exports for platform admins, DB-backed rate limiting if ever clustered.

## Known limitations
- Multi-SCO packages: only the first SCO is launched (upload shows a warning).
- The final (terminate) commit is sent with `sendBeacon` (64 KB browser limit). The player commits
  synchronously before terminating when the learner uses Exit; autocommit runs every 30 s otherwise.
- Progress % is only known when the package reports `cmi.progress_measure` (SCORM 2004); otherwise
  in-progress courses show "—".
- In-memory rate limiter and content-access cache assume a single app process (PM2 `instances: 1`).
