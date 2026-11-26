import LegalPage, { legalMetadata } from "@/components/LegalPage";

export const metadata = legalMetadata("tentang");

export default function Page() {
  return <LegalPage file="tentang" />;
}
