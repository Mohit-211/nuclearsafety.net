import 'server-only';
import mysql from 'mysql2/promise';
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import { env } from '@/lib/env';
import * as schema from './schema';

export type Database = MySql2Database<typeof schema>;
/** A transaction handle (same query API as Database). */
export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

function createPool() {
  const e = env();
  const base = { connectionLimit: e.DB_POOL_SIZE, timezone: 'Z', dateStrings: false as const, supportBigNumbers: true };
  if (e.DATABASE_URL) return mysql.createPool({ uri: e.DATABASE_URL, ...base });
  return mysql.createPool({ host: e.DB_HOST, port: e.DB_PORT, user: e.DB_USER, password: e.DB_PASSWORD, database: e.DB_NAME, ...base });
}

// Reuse one pool per process (survives dev hot reloads).
const globalForDb = globalThis as unknown as { __db?: Database };

export function db(): Database {
  if (!globalForDb.__db) globalForDb.__db = drizzle(createPool(), { schema, mode: 'default' });
  return globalForDb.__db;
}

export { schema };
