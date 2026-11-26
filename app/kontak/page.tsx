import LegalPage, { legalMetadata } from "@/components/LegalPage";

export const metadata = legalMetadata("kontak");

export default function Page() {
  return <LegalPage file="kontak" />;
}
