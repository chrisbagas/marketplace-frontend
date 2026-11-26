import LegalPage, { legalMetadata } from "@/components/LegalPage";

export const metadata = legalMetadata("faq");

export default function Page() {
  return <LegalPage file="faq" />;
}
