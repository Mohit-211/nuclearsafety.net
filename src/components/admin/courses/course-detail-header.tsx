'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Pencil, UploadCloud, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeading } from '@/components/shared/page-heading';
import { CourseFormDialog, type CourseFormValues } from '@/components/admin/dialogs/course-form-dialog';
import { EnrollmentDialog, type EnrollItem } from '@/components/admin/dialogs/enrollment-dialog';
import { PackageUploadDialog } from '@/components/admin/dialogs/package-upload-dialog';
import { saveCourseEnrollmentAction } from '@/lib/actions/admin';
import { statusClass } from '@/lib/format';

export function CourseDetailHeader({ course, subtitle, canManageCatalogue, hasActiveVersion, enrolled, learnerOptions, defaultDueDate }: {
  course: CourseFormValues & { id: number; statusLabel: string };
  subtitle: string;
  canManageCatalogue: boolean;
  hasActiveVersion: boolean;
  enrolled: EnrollItem[];
  learnerOptions: EnrollItem[];
  defaultDueDate: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [dialog, setDialog] = useState<'edit' | 'enroll' | 'upload' | null>(canManageCatalogue && params.get('edit') ? 'edit' : null);
  const close = (open: boolean) => {
    if (open) return;
    setDialog(null);
    if (params.get('edit')) router.replace(pathname);
  };
  const assignable = course.status === 'published' && hasActiveVersion;

  return <>
    <PageHeading
      title={<div className="flex items-center gap-3 flex-wrap">
        <h1>{course.title}</h1>
        <span className={`badge ${statusClass(course.statusLabel)}`}>{course.statusLabel}</span>
      </div>}
      subtitle={subtitle}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {canManageCatalogue && <Button variant="outline" onClick={() => setDialog('edit')}><Pencil size={15} />Edit course</Button>}
        {canManageCatalogue && <Button variant="outline" onClick={() => setDialog('upload')}><UploadCloud size={15} />Upload new version</Button>}
        <Button onClick={() => setDialog('enroll')} disabled={!assignable} title={assignable ? undefined : 'Publish the course to assign learners'}><UserPlus size={15} />Manage enrollments</Button>
      </div>
    </PageHeading>

    {canManageCatalogue && <CourseFormDialog open={dialog === 'edit'} onOpenChange={close} courseId={course.id} initial={course} hasActiveVersion={hasActiveVersion} />}
    {canManageCatalogue && <PackageUploadDialog open={dialog === 'upload'} onOpenChange={close} courseId={course.id} courseTitle={course.title} />}
    <EnrollmentDialog open={dialog === 'enroll'} onOpenChange={close} noun="learner" subject={course.title}
      enrolled={enrolled} available={learnerOptions} defaultDueDate={defaultDueDate}
      save={diff => saveCourseEnrollmentAction({ courseId: course.id, ...diff })} />
  </>;
}
