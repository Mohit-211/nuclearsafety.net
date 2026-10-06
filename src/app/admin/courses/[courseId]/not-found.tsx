import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminRecordNotFound } from "@/components/admin/shared/detail-panels";

export default function AdminCourseNotFound() {
  return (
    <AdminRecordNotFound
      icon={<BookOpen size={30} />}
      message="This course is not in the catalogue."
      action={
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/admin/courses">Back to courses</Link>
        </Button>
      }
    />
  );
}
