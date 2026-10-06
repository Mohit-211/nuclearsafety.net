'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertUser } from '@/lib/auth/current-user';
import { requestRetake } from '@/lib/services/retakes';
import { runAction, zId, type ActionResult } from './result';

/** Learner asks to retake a course they completed (admin approval required). */
export async function requestRetakeAction(input: { courseId: number; reason?: string }): Promise<ActionResult> {
  return runAction(async () => {
    const user = await assertUser();
    const v = z.object({ courseId: zId, reason: z.string().trim().max(500).optional() }).parse(input);
    await requestRetake(user, v.courseId, v.reason || null);
    revalidatePath('/', 'layout');
    return undefined;
  });
}
