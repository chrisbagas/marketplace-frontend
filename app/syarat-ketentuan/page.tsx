import LegalPage, { legalMetadata } from "@/components/LegalPage";

export const metadata = legalMetadata("syarat-ketentuan");

export default function Page() {
  return <LegalPage file="syarat-ketentuan" />;
}
