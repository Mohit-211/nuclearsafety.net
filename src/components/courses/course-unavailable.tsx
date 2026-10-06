import Link from 'next/link';

export function CourseUnavailable({ message = 'This course is not in your assigned training.' }: { message?: string }) {
  return <div className="empty-state">
    <h1 className="text-lg font-semibold">Course unavailable</h1>
    <p className="mt-2 text-sm">{message}</p>
    <Link href="/my-training" className="text-link mt-4 inline-block">Back to my courses</Link>
  </div>;
}
