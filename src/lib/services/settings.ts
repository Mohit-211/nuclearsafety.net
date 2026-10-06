import 'server-only';
import { cache } from 'react';
import { z } from 'zod';
import { db, schema } from '@/db';
import { audit } from '@/lib/audit';

/** Platform settings that actually drive behaviour. Add keys here, not ad-hoc. */
export const settingsSchema = z.object({
  supportEmail: z.string().trim().max(255).email('Enter a valid email address.').or(z.literal('')).default(''),
  supportMessage: z.string().trim().max(500).default('For questions about your assigned training, contact your training coordinator.'),
  /** Days after assignment a due date is suggested; 0 = no default due date. */
  defaultDueDays: z.coerce.number().int().min(0).max(365).default(30),
});

export type PlatformSettings = z.infer<typeof settingsSchema>;

export const getSettings = cache(async (): Promise<PlatformSettings> => {
  const rows = await db().select().from(schema.platformSettings);
  const raw = Object.fromEntries(rows.map(r => [r.key, r.value]));
  const parsed = settingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : settingsSchema.parse({});
});

export async function saveSettings(actorId: number, input: Partial<PlatformSettings>) {
  const current = await getSettings();
  const next = settingsSchema.parse({ ...current, ...input });
  await db().transaction(async tx => {
    for (const [key, value] of Object.entries(next)) {
      await tx.insert(schema.platformSettings).values({ key, value, updatedBy: actorId })
        .onDuplicateKeyUpdate({ set: { value, updatedBy: actorId } });
    }
    await audit({ actorId, action: 'settings.updated', entityType: 'settings', metadata: next }, tx);
  });
  return next;
}
