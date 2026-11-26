import LegalPage, { legalMetadata } from "@/components/LegalPage";

export const metadata = legalMetadata("kebijakan-privasi");

export default function Page() {
  return <LegalPage file="kebijakan-privasi" />;
}
