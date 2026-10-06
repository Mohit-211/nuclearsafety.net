/*
 * Create (or promote) the first platform admin.
 *   npm run db:seed-admin
 * Reads SEED_ADMIN_EMAIL / SEED_ADMIN_NAME / SEED_ADMIN_PASSWORD from .env.
 * Without a password it prints a one-time set-password link instead.
 */
import mysql from 'mysql2/promise';
import { hashPassword, passwordProblem, randomToken, sha256 } from '../src/lib/auth/crypto';

try { process.loadEnvFile('.env'); } catch { /* use the real environment */ }
const e = process.env;

async function main() {
  const email = e.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const name = e.SEED_ADMIN_NAME?.trim() || 'Platform Admin';
  const password = e.SEED_ADMIN_PASSWORD || '';
  if (!email) throw new Error('Set SEED_ADMIN_EMAIL in .env');
  if (password && passwordProblem(password)) throw new Error(`SEED_ADMIN_PASSWORD: ${passwordProblem(password)}`);

  const conn = e.DATABASE_URL
    ? await mysql.createConnection({ uri: e.DATABASE_URL, timezone: 'Z' })
    : await mysql.createConnection({ host: e.DB_HOST ?? '127.0.0.1', port: Number(e.DB_PORT ?? 3306), user: e.DB_USER, password: e.DB_PASSWORD, database: e.DB_NAME, timezone: 'Z' });
  try {
    const [rows] = await conn.query<mysql.RowDataPacket[]>('SELECT id FROM users WHERE email = ?', [email]);
    let userId: number;
    if (rows[0]) {
      userId = rows[0].id as number;
      await conn.query("UPDATE users SET role = 'platform_admin', status = 'active' WHERE id = ?", [userId]);
      await conn.query('DELETE FROM organization_members WHERE user_id = ?', [userId]);
      console.log(`Promoted existing user ${email} to platform admin.`);
    } else {
      const [res] = await conn.query<mysql.ResultSetHeader>("INSERT INTO users (email, name, role, status) VALUES (?, ?, 'platform_admin', 'active')", [email, name]);
      userId = res.insertId;
      console.log(`Created platform admin ${email}.`);
    }
    await conn.query("INSERT INTO audit_events (actor_id, action, entity_type, entity_id, subject_user_id, metadata) VALUES (NULL, 'user.role_changed', 'user', ?, ?, ?)",
      [userId, userId, JSON.stringify({ via: 'seed-admin', role: 'platform_admin' })]);

    if (password) {
      await conn.query('UPDATE users SET password_hash = ?, password_changed_at = UTC_TIMESTAMP() WHERE id = ?', [await hashPassword(password), userId]);
      console.log('Password set from SEED_ADMIN_PASSWORD. Remove it from .env now.');
    } else {
      const token = randomToken();
      await conn.query("INSERT INTO password_tokens (id, user_id, purpose, expires_at) VALUES (?, ?, 'invite', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 72 HOUR))", [sha256(token), userId]);
      console.log(`Set the password here (valid 72 hours):\n${new URL(`/reset-password?token=${encodeURIComponent(token)}`, e.APP_URL || 'http://localhost:3000')}`);
    }
  } finally {
    await conn.end();
  }
}

main().catch(err => { console.error(err instanceof Error ? err.message : err); process.exit(1); });
