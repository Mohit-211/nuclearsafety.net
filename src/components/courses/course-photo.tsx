import Image from 'next/image';

export function CoursePhoto({ preload = false }: { preload?: boolean }) {
  return <Image
    className="course-photo"
    src="/nuclear-station.jpg"
    alt="Nuclear power station with cooling towers"
    width={1536}
    height={1024}
    sizes="(max-width: 420px) 100vw, 240px"
    preload={preload}
  />;
}
