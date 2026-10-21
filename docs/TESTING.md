# Testing

## Unit tests — `npm test` (vitest, no database)
`tests/manifest.test.ts`, `tests/zip.test.ts` (real ZIPs incl. zip-slip, symlink, bomb limits),
`tests/cmi.test.ts`, `tests/policy.test.ts`, `tests/rate-limit.test.ts`, `tests/compress.test.ts`,
`tests/certificates.test.ts` (number format, title line breaking, PDF rendering, file name),
`tests/password-generator.test.ts`. 41 tests, all passing (2026-10-22).

## End-to-end smoke test — `tests/e2e/smoke.mjs`
Drives a running production server over HTTP and Server Actions (action ids read from
`.next/server/server-reference-manifest.json`) as platform admin, learner and corporate admin.
111 checks: auth, invites, admin-set passwords (policy, no invite, sign-in, reset signs out and voids
links, no self-reset, corporate scope), uploads (valid/invalid), publish, assignment, launch, content auth +
Range + traversal, commits (incl. cross-origin/other-user rejection), resume CMI, completion → certificate
(one per completion, emailed once with the PDF attached, learner/admin downloads and access rules, admin page
links, kept during retakes, new certificate for a completed retake), certificates for earlier completions
(listed for admins, out-of-scope generation refused, generated once with the original date, emailed, audited),
versioning, reports/CSV, organization tenancy boundaries, retake request/approval rules, deactivation,
DB state, audit.

Requirements: a **fresh** migrated database, the seed admin from `.env` (with `SEED_ADMIN_PASSWORD`),
SMTP unset (invite links are read from the server log).
```bash
npm run build && npm run db:migrate && npm run db:seed-admin
npx next start -p 3100 > app.log 2>&1 &
SMOKE_BASE_URL=http://localhost:3100 SMOKE_APP_LOG=app.log node tests/e2e/smoke.mjs
```
Last run 2026-10-22 against MySQL 8.4.10 (throwaway local instance): ALL PASSED.
Note: with `loading.tsx` boundaries, `redirect()`/`notFound()` are streamed in a 200 response — the
test checks the in-body markers; no protected data is rendered.

## Real-package browser test (2026-10-07)
Ran outside the repo with `playwright-core` driving installed Chrome (headless) against a production
build + throwaway MySQL 8.4. Both client packages passed: admin UI upload/publish/assign, invite
acceptance, launch, resume, tab close (beacon) + resume, scripted quiz pass (100%), Exit, completion,
score, certificate, review-only, retake request → admin approval → fresh attempt. Details: `docs/SCORM.md`.
To repeat manually: follow the smoke steps in `docs/DEPLOYMENT.md` §6.

## Passwords and certificates in the browser (2026-10-22)
Headless Chrome against a production build: Add user with a generated password → sign-in details shown and
copyable; Reset password on the learner page → the learner signs in with the new password; certificate
downloads from the player completion screen, course page, dashboard, certificates page and admin learner page
(file `Certificate-First-Last.pdf`); dialogs checked at 390 px width; earlier completions without a certificate
show no download until an admin uses "Generate all" on the dashboard. The generated PDF was compared with the
client's sample by rendering both: identical layout (text positions within ~2 pt).

## Not yet covered
- Firefox / Safari / Edge / mobile; production Nginx/PM2 run.
