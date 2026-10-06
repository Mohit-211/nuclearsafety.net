import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/page-heading";
import { CertificateList } from "@/components/certificates/certificate-list";
import { requireUser } from "@/lib/auth/current-user";
import { pageMetadata } from "@/lib/metadata";
import { myCertificates } from "@/lib/services/learner";

export const metadata: Metadata = pageMetadata(
  "Certificates",
  "View your completed training certificates.",
  { ogDescription: "Your nuclear safety training achievements." },
);

export default async function CertificatesPage() {
  const user = await requireUser();
  const certificates = await myCertificates(user);
  return (
    <>
      <PageHeading title="My certificates" subtitle="A record of your completed training.">
        <span className="badge completed">{certificates.length} certificate{certificates.length === 1 ? "" : "s"} earned</span>
      </PageHeading>
      <CertificateList certificates={certificates} />
    </>
  );
}
