# Testing

## Unit tests — `npm test` (vitest, no database)
`tests/manifest.test.ts`, `tests/zip.test.ts` (real ZIPs incl. zip-slip, symlink, bomb limits),
`tests/cmi.test.ts`, `tests/policy.test.ts`. 28 tests, all passing (2026-10-07).

## End-to-end smoke test — `tests/e2e/smoke.mjs`
Drives a running production server over HTTP and Server Actions (action ids read from
`.next/server/server-reference-manifest.json`) as platform admin, learner and corporate admin.
60 checks: auth, invites, uploads (valid/invalid), publish, assignment, launch, content auth + Range +
traversal, commits (incl. cross-origin/other-user rejection), resume CMI, completion → certificate,
versioning, reports/CSV, organization tenancy boundaries, deactivation, DB state, audit.

Requirements: a **fresh** migrated database, the seed admin from `.env` (with `SEED_ADMIN_PASSWORD`),
SMTP unset (invite links are read from the server log).
```bash
npm run build && npm run db:migrate && npm run db:seed-admin
npx next start -p 3100 > app.log 2>&1 &
SMOKE_BASE_URL=http://localhost:3100 SMOKE_APP_LOG=app.log node tests/e2e/smoke.mjs
```
Last run 2026-10-07 against MySQL 8.4 (throwaway local instance): ALL PASSED.
Note: with `loading.tsx` boundaries, `redirect()`/`notFound()` are streamed in a 200 response — the
test checks the in-body markers; no protected data is rendered.

## Not yet covered
- In-browser SCORM playback (scorm-again ↔ real package) — pending the client's packages.
- Multi-browser close/refresh scenarios; production Nginx/PM2 run.
