# SCORM integration

## Supported
- SCORM 1.2 and SCORM 2004 (2nd/3rd/4th edition, detected from `<schemaversion>`, falling back to namespaces).
- Runtime: **scorm-again 3.4** (`scorm-again/scorm12`, `scorm-again/scorm2004`), loaded lazily in the player.
- Single-SCO launch (first SCO of the default organization). Multi-SCO: first SCO only + upload warning.

## Upload pipeline (`src/app/api/admin/packages/route.ts` → `src/lib/scorm/ingest.ts`)
1. Stream the request body to `STORAGE_DIR/tmp/upload-<uuid>.zip` (cap `SCORM_MAX_UPLOAD_MB`).
2. `inspectZip`: reject non-ZIP, symlinks, encrypted entries, unsafe paths, > `SCORM_MAX_FILES`,
   > `SCORM_MAX_UNCOMPRESSED_MB`; ignore `__MACOSX`/`.DS_Store`. `imsmanifest.xml` must be at the root
   (a single wrapping folder is accepted with a warning).
3. `parseManifest`: version, title, default organization items, resource hrefs with `xml:base` and item
   `parameters`, `adlcp:masteryscore`, `adlcp:datafromlms`, `adlcp:completionThreshold`; launch file must exist.
4. `extractZip` into a staging dir (byte counting, every path re-checked) → atomic rename to
   `STORAGE_DIR/packages/<uuid>/`.
5. DB transaction: create course (draft, code `NS-<100+id>`, version 1 active) or add version N (inactive).
   Audit `course.created` / `course_version.uploaded`. Files are removed if the DB step fails.

## Launch & runtime
- `/courses/[id]/play` → `launchCourse()` (`src/lib/services/attempts.ts`): finds the active assignment,
  resumes the latest attempt or creates one on the course's active version, and builds the initial CMI
  (`cmi.ts#buildLaunchCmi`): learner id/name, `entry` (`ab-initio` / `resume` / `""`), credit/mode
  (`review` + `no-credit` for completed attempts), stored suspend data/location/interactions,
  total time, mastery score / launch data / completion threshold from the manifest.
- Browser: `src/lib/scorm/runtime.ts` creates the API, `loadFromJSON(initialCmi)`, installs
  `window.API` (1.2) or `window.API_1484_11` (2004), then the iframe loads
  `/scorm/<versionId>/<launchPath>` (same origin).
- Settings: `lmsCommitUrl=/api/attempts/<id>/commit`, `autocommit` every 30 s, synchronous XHR commits
  (SCORM-compliant), terminate commit via `sendBeacon` with `?terminate=true`,
  `autoCompleteLessonStatus=false` (opening a course never completes it), `mastery_override` default (1.2).
- Exit button / `pagehide`: the adapter commits synchronously then terminates if the content has not.

## Persistence (`recordCommit`)
- Stores the full committed CMI JSON (`attempts.cmi`) + normalised columns.
- 1.2 `lesson_status` is split: passed → completed+passed, failed → completed+failed, completed →
  completed+unknown, incomplete/browsed → incomplete.
- Completion and pass are sticky; scores/progress never overwritten with blanks.
- `last_exit` is set on terminate commits, cleared (null = session not cleanly ended → resume) otherwise.
- SCORM 2004: if the last session terminated with `cmi.exit` other than `suspend` (and the course is not
  complete) the next launch creates a new attempt (on the active version), per the 2004 spec.
- Audit: `learner.course_started`, `learner.course_completed`, `learner.course_passed`, `learner.course_failed`.

## Verified so far
- Unit tests: manifest parsing (1.2, 2004, xml:base, parameters, multi-SCO, invalid), ZIP security,
  CMI mapping/time parsing/resume CMI, policy. scorm-again's commit payload format and `loadFromJSON`
  round-trip were verified in Node against the installed library.
- E2E (HTTP level): upload, launch, content serving with auth + Range, commit, terminate, resume CMI,
  pass → certificate, versioning keeps old attempts on v1.

## Client packages — findings (tested 2026-10-07, headless Chrome, real browser runtime)
Packages: `operation-cleaning-training-scorm-1.2.zip` and `operation-cleaning-training-scorm-2004.zip`
(Articulate Rise export, "FIXED NUCLEAR GAUGE OPERATION & CLEANING TRAINING", ~125 MB each, 128/138 files,
8 lessons, final 25-question "Knowledge Check" quiz, pass mark 75%).

| Finding | Detail |
|---|---|
| Manifest | Single SCO, launch `scormdriver/indexAPI.html`; 1.2 `schemaversion 1.2`, 2004 `2004 4th Edition`; both pass `datafromlms` → `launch_data`. Manifest `<file>` hrefs are URL-encoded (`%20`); the ZIP entries are not — only the launch file is checked, so this is fine. |
| API discovery | `scormdriver.js` scans parent frames → finds `window.API` / `window.API_1484_11` in our player. Initialise OK in both. |
| Completion rule | Rise `completeWith: quiz`, `reporting: passed-incomplete`: the course reports **passed** only when the quiz is passed; a failed quiz stays **incomplete** (score still reported). 2004 reports `completed` + `passed` + `score.scaled`. |
| Progress | Rise does **not** send `cmi.progress_measure` → in-progress courses show "—" for progress (by design, not a bug). |
| Bookmark / suspend data | `lesson_location`/`location` = `index.html#/lessons/<id>`; suspend data is LZW-compressed JSON (~0.4–1.6 KB). scorm-again deliberately accepts up to 64,000 chars for 1.2 `suspend_data`, so no 4096 truncation. Resume returns to the bookmarked lesson. |
| Commits | Rise forces a commit every 20 s (`FORCED_COMMIT_TIME`); plus our 30 s autocommit. |
| Exit | `EXIT_BEHAVIOR=SCORM_RECOMMENDED`: Rise "Exit course" calls finish and navigates its inner frame to `goodbye.html` (stays inside our iframe) → player shows the "closed" screen. |
| Tab close | Closing the tab mid-course delivers the terminate commit via `sendBeacon` (`last_exit=suspend`, total time saved); reopening resumes. |
| Review mode | `REVIEW_MODE_IS_READ_ONLY` handling: completed attempts launch with `mode=review`/`no-credit`; results do not change. |

Verified end to end in the browser for **both** packages: upload via admin UI → publish → assign →
invite → launch → initialise → bookmark → close tab → resume → pass quiz (100%) → Exit → Completed +
score + certificate → review-only → retake request → admin approval → fresh ab-initio attempt.

## Player UX and launch performance
- **Loader:** while the content starts, the player shows a "Loading your course…" card over the frame
  (`use-content-ready.ts`). It polls the same-origin frame tree (into scormdriver's inner frame) and hides as
  soon as text/images/video render; after 12 s it adds a reassurance message; after 60 s it gives up and
  reveals the frame regardless.
- **Zoom:** −/100%/+ in the player's bottom bar (50–200%). Implemented by scaling the iframe with a CSS
  transform and enlarging its box inversely, so content reflows like browser zoom and clicks still land
  correctly. The chosen level is remembered per device (localStorage `ns-player-zoom`).
- **Compression + caching** (`src/lib/scorm/compress.ts`, content route): JS/CSS/HTML/SVG/JSON are served
  Brotli (q5) or gzip, cached compressed in memory (128 MB cap); non-HTML files are
  `Cache-Control: private, max-age=2592000, immutable` (a new upload is a new version URL), HTML uses
  `no-cache` + `Last-Modified`/304. Measured with the Rise package at 10 Mbps: bytes before first paint
  5.7 MB → 1.4 MB, first launch 7.5 s → 4.4 s, repeat launch 2.5 s. The remaining time is the Rustici
  driver's sequential frame loading and Rise start-up.

## Retakes
A completed attempt is review-only. The learner can request a retake (course page); a platform admin, or
the corporate admin of the learner's organization, approves/declines it (admin dashboard and learner page).
Approval creates a new attempt on the course's **active** version; earlier attempts, completions and
certificates are kept. Learner is emailed the decision. See `src/lib/services/retakes.ts`.
