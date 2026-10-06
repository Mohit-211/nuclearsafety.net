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

## Still to verify with the client's packages (pending — not yet received)
- Launch file (expected `scormdriver/indexAPI.html` for the Rise-style package) and that
  `scormdriver.js` finds the API from inside the iframe in all browsers.
- Bookmarking/resume via `AutoBookmark.js` and suspend data size (1.2 limit 4096 chars — scorm-again
  enforces it; Rise usually compresses).
- What `CourseExit.js` does on exit (window.close / top navigation) inside our iframe.
- Whether the 2004 package reports `progress_measure`, `success_status`, `score.scaled`.
Record findings here after testing.
