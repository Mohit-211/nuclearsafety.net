import { defineConfig } from 'drizzle-kit';

// drizzle-kit runs outside Next.js, so load .env ourselves (Node >= 21.7).
try { process.loadEnvFile('.env'); } catch { /* no .env: rely on the real environment */ }

const e = process.env;
const url = e.DATABASE_URL
  || `mysql://${encodeURIComponent(e.DB_USER ?? '')}:${encodeURIComponent(e.DB_PASSWORD ?? '')}@${e.DB_HOST ?? '127.0.0.1'}:${e.DB_PORT ?? '3306'}/${e.DB_NAME ?? ''}`;

export default defineConfig({
  dialect: 'mysql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
