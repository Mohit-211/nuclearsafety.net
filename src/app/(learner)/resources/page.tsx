import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/page-heading";
import { ResourceList } from "@/components/resources/resource-list";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata(
  "Resources",
  "Nuclear safety learning guides and reference materials.",
  { ogDescription: "Training reference guides and supporting documents." },
);

export default function ResourcesPage() {
  return (
    <>
      <PageHeading title="Resources" subtitle="Reference materials to support your learning." />
      <ResourceList />
    </>
  );
}
