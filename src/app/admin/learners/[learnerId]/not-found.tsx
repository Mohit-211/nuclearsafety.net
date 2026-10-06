import Link from "next/link";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminRecordNotFound } from "@/components/admin/shared/detail-panels";

export default function AdminLearnerNotFound() {
  return (
    <AdminRecordNotFound
      icon={<Users size={30} />}
      message="This learner account is not in the register."
      action={
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/admin/learners">Back to learners</Link>
        </Button>
      }
    />
  );
}
