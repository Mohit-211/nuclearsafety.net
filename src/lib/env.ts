import { z } from 'zod';

/**
 * Server environment, validated once on first use. Never import this from a
 * client component — it reads secrets.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  APP_NAME: z.string().default('nuclearsafety.net'),

  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().default(3306),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),
  DB_POOL_SIZE: z.coerce.number().int().positive().default(10),

  SESSION_COOKIE_NAME: z.string().default('ns_session'),
  SESSION_REMEMBER_DAYS: z.coerce.number().int().positive().default(30),

  STORAGE_DIR: z.string().default('./storage'),
  SCORM_MAX_UPLOAD_MB: z.coerce.number().positive().default(1024),
  SCORM_MAX_UNCOMPRESSED_MB: z.coerce.number().positive().default(4096),
  SCORM_MAX_FILES: z.coerce.number().int().positive().default(20000),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default('nuclearsafety.net <no-reply@nuclearsafety.net>'),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    // Treat empty strings in .env as "unset" so defaults apply.
    const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ''));
    cached = schema.parse(raw);
  }
  return cached;
}

export const isProduction = () => env().NODE_ENV === 'production';
