@AGENTS.md

# SCORM Training Platform — engineering context

Self-hosted training platform around a client-supplied SCORM course (nuclearsafety.net).
**Stack:** Next.js 16 (App Router, React 19, React Compiler) · MySQL 8 via Drizzle ORM + mysql2 ·
scorm-again 3 (SCORM 1.2 + 2004 runtime) · Nginx + PM2 on a Contabo VPS. No separate backend,
no hosted auth, no Docker. The Lovable UI is the visual baseline — preserve its classes/markup.

Read before changing architecture: `docs/ARCHITECTURE.md`, `docs/PROGRESS.md`, `docs/ENDPOINTS.md`,
`docs/DATA_MODEL.md`, `docs/SCORM.md`, `docs/DEPLOYMENT.md`, `docs/TESTING.md`.
Original blueprint: `SCORM_Training_Platform_Claude_Engineering_Context.pdf` (in the user's Downloads).

## Commands
```
npm run dev            # dev server (needs .env with DATABASE_URL)
npm run build / start  # production build / serve
npm run typecheck      # next typegen + tsc
npm run lint           # eslint
npm test               # vitest unit tests (no DB needed)
npm run db:generate    # create a migration from src/db/schema.ts changes (commit drizzle/*)
npm run db:migrate     # apply migrations to the DB in .env
npm run db:seed-admin  # create/promote the first platform admin (SEED_ADMIN_* in .env)
```
All configuration lives in `.env` (template: `.env.example`).

## Where things live
- `src/db/schema.ts` — the whole MySQL schema; `drizzle/` — generated SQL migrations (never edit applied ones).
- `src/lib/auth/` — `policy.ts` (pure authorization rules — **the** place for permission logic),
  `current-user.ts` (`requireUser/requireAdmin/requirePlatformAdmin` for pages, `assert*` for actions/routes),
  `session.ts` (DB sessions, hashed tokens), `crypto.ts` (scrypt passwords, tokens).
- `src/lib/services/` — server-only domain + data access. Every admin function takes an `AdminScope`
  and filters by it. `enrollments.ts#summarize` is the single source of learner status/progress/score.
- `src/lib/actions/` — Server Actions (`'use server'`), thin zod-validated wrappers returning `ActionResult`.
- `src/lib/scorm/` — `manifest.ts` (imsmanifest parsing), `zip.ts` (safe ZIP inspect/extract),
  `ingest.ts` (upload pipeline), `cmi.ts` (CMI ⇄ persisted state, resume CMI), `runtime.ts`
  (**browser** adapter — the only file that touches scorm-again), `storage.ts`, `mime.ts`.
- Route handlers: `src/app/api/admin/packages` (ZIP upload), `src/app/api/attempts/[attemptId]/commit`
  (scorm-again lmsCommitUrl), `src/app/scorm/[versionId]/[...path]` (authorised content serving),
  `src/app/api/admin/reports/export` (CSV).
- UI: `src/app/(auth|learner|player)/`, `src/app/admin/`; components under `src/components/`.
  Shared view-model types in `src/lib/types.ts`; display helpers in `src/lib/format.ts`.

## Conventions / rules
- Pages call `require*()` themselves (layouts are not a security boundary). Actions/routes call `assert*()`.
- Never trust ids/roles from the browser: services re-load facts from MySQL and apply `policy.ts`.
- No hard deletes of users/courses/assignments/attempts/versions; deactivate, archive, soft-remove.
- Attempts are pinned to the package version they started on; activating a new version only affects new attempts.
- Completion = SCORM completion AND not failed (`isCourseComplete`); completion and pass are sticky.
- Completed attempts are review-only; a new attempt only via an approved retake request (`services/retakes.ts`).
- React Compiler is on: closures passed as props are memoised by their dependencies, which are read
  during render — never use `x!.prop` on possibly-undefined state inside such closures.
- Audit sensitive changes via `audit()` (`src/lib/audit.ts`); learner activity feeds read `learner.*` events.
- Client components import server actions directly; never import `@/db` or services into client code.
- Add a migration for every schema change (`npm run db:generate`) and update `docs/DATA_MODEL.md`.
- Keep `docs/ENDPOINTS.md` and `docs/PROGRESS.md` current after each slice. Document only what exists.

## Current state (2026-10-07)
All blueprint phases 1–11 implemented, plus admin-approved retakes. Unit tests (30) and the e2e smoke
test (67 checks, MySQL 8.4) pass. The client's Rise packages (SCORM 1.2 and 2004, in the user's Downloads:
`operation-cleaning-training-scorm-*.zip`) were verified end to end in headless Chrome (see `docs/SCORM.md`).
**Not yet done:** production deploy on the Contabo VPS; manual checks in other browsers.
See `docs/PROGRESS.md` for the full Completed / Pending list and known limitations.
