import { TableSkeleton } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <>
      <div className="page-heading"><div><Skeleton className="h-7 w-56" /><Skeleton className="h-3 w-80 mt-3" /></div></div>
      <TableSkeleton rows={8} cols={6} />
    </>
  );
}
