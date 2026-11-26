import type { Metadata } from "next";
import { loadLegal, type LegalFile } from "@/lib/legal";

// Server component: renders content/legal/<file>.md. Used by the six
// info pages (syarat, privasi, pengembalian, kontak, tentang, faq).

export function legalMetadata(file: LegalFile): Metadata {
  const { title, description } = loadLegal(file);
  return { title: `${title} — KaryaKita`, description };
}

export default function LegalPage({ file }: { file: LegalFile }) {
  const { body } = loadLegal(file);
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <div className="card p-6 sm:p-10">{body}</div>
    </article>
  );
}
