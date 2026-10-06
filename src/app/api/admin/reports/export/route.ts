import { assertAdmin, AuthError } from '@/lib/auth/current-user';
import { todayISO } from '@/lib/format';
import { reportCsv, reportRows } from '@/lib/services/reports';

/** GET /api/admin/reports/export — CSV of the training report, scoped to the caller's admin scope. */
export const dynamic = 'force-dynamic';

export async function GET() {
  let scope;
  try {
    ({ scope } = await assertAdmin());
  } catch (err) {
    return new Response('Forbidden', { status: err instanceof AuthError ? err.status : 403 });
  }
  const csv = reportCsv(await reportRows(scope));
  return new Response(`﻿${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="training-report-${todayISO()}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
