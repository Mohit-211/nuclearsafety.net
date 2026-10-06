import Link from "next/link";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminRecordNotFound } from "@/components/admin/shared/detail-panels";

export default function AdminOrganizationNotFound() {
  return (
    <AdminRecordNotFound
      icon={<Building2 size={30} />}
      message="This organization does not exist."
      action={
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/admin/organizations">Back to organizations</Link>
        </Button>
      }
    />
  );
}
