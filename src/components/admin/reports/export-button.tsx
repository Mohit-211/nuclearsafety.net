import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Downloads the CSV report from the export route (same admin scope as the page). */
export function ExportButton() {
  return <Button size="sm" asChild>
    <a href="/api/admin/reports/export" download><Download size={15} /> Export report</a>
  </Button>;
}
