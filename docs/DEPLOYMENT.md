# Deployment (Contabo VPS: Nginx + PM2 + MySQL 8 on the same host)

## 1. Prerequisites on the VPS
- Node.js 24 LTS, npm, PM2 (`npm i -g pm2`), Nginx, MySQL 8.x, certbot.

## 2. MySQL
```sql
CREATE DATABASE scorm_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'scorm_app'@'127.0.0.1' IDENTIFIED BY '<strong password>';
GRANT ALL PRIVILEGES ON scorm_platform.* TO 'scorm_app'@'127.0.0.1';
```
Bind MySQL to 127.0.0.1. Back up with `mysqldump` **and** back up `STORAGE_DIR` (both are needed to restore).

## 3. Application
```bash
git clone <repo> /var/www/scorm-platform && cd /var/www/scorm-platform
cp .env.example .env    # fill DATABASE_URL, APP_URL=https://<domain>, SMTP_*, STORAGE_DIR (absolute path recommended), SEED_ADMIN_*
npm ci
npm run db:migrate
npm run db:seed-admin   # then remove SEED_ADMIN_PASSWORD from .env
npm run build
pm2 start ecosystem.config.cjs && pm2 save && pm2 startup
```
`STORAGE_DIR` must be writable by the PM2 user and outside `public/`. Keep PM2 at **one instance**
(in-memory rate limiter / content access cache).

## 4. Nginx
Use `deploy/nginx.conf.example`. Important: `client_max_body_size` ≥ `SCORM_MAX_UPLOAD_MB`,
`proxy_request_buffering off` for `/api/admin/packages`, long proxy timeouts, `Host` and
`X-Forwarded-*` headers forwarded (the commit endpoint's same-origin check uses them). Then `certbot --nginx`.

## 5. Updating
```bash
git pull && npm ci && npm run db:migrate && npm run build && pm2 reload scorm-platform
```

## 6. Smoke test after deploy
Sign in as the seeded admin → Courses → Add course (upload the SCORM ZIP) → publish → Learners →
Add user (invite email arrives) → assign the course → sign in as that learner → Start course → exit →
re-open (should resume) → complete → certificate visible; Reports shows the result.
