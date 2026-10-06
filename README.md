# nuclearsafety.net — SCORM Training Platform

Self-hosted training platform (Next.js 16 + MySQL 8 + scorm-again) that delivers a client-supplied
SCORM 1.2 / 2004 course to individual and corporate learners, with admin course management,
package versioning, organizations, assignments and reporting.

## Quick start (development)
```bash
cp .env.example .env          # set DATABASE_URL (MySQL 8) and SEED_ADMIN_*
npm install
npm run db:migrate
npm run db:seed-admin
npm run dev                   # http://localhost:3000
```
Without SMTP settings, invite/reset emails (with their links) are printed to the server console.

## Documentation
- `CLAUDE.md` — engineering context and conventions (start here)
- `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/ENDPOINTS.md`, `docs/SCORM.md`
- `docs/PROGRESS.md` — completed / pending work
- `docs/DEPLOYMENT.md` — VPS deployment (Nginx + PM2), `docs/TESTING.md`
