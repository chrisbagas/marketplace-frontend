import type { Metadata } from "next";
import Catalog from "./Catalog";
import { getTaxonomy } from "@/lib/search";
import { absoluteUrl } from "@/lib/site";

type SP = Record<string, string | string[] | undefined>;

// Only these parameters make a catalog URL worth indexing on its own; any
// other (search text, attributes, colour, price, creator, sort, paging) would
// multiply near-duplicate pages.
const INDEXABLE = new Set(["type", "category"]);

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const q = first(sp.q).trim();
  const type = first(sp.type).split(",").filter(Boolean);
  const category = first(sp.category);
  const filtered = Object.entries(sp).some(([k, v]) => !INDEXABLE.has(k) && first(v) !== "");

  // label of the single type/category being browsed, when there is exactly one
  let label = "";
  if (!q && ((type.length === 1 && !category) || (type.length === 0 && category))) {
    const facets = await getTaxonomy().catch(() => null);
    label =
      (type.length === 1 ? facets?.types.find((t) => t.id === type[0])?.label : facets?.categories.find((c) => c.id === category)?.label) ?? "";
  }

  const title = q ? `Hasil untuk “${q}” — KaryaKita` : label ? `${label} Desain Kreator Indonesia — KaryaKita` : "Jelajahi Semua Karya — KaryaKita";
  const description = label
    ? `Jelajahi ${label.toLowerCase()} dengan desain orisinal kreator lokal di KaryaKita. Dicetak sesuai pesanan, dikirim ke seluruh Indonesia.`
    : "Kaos, hoodie, mug, dan totebag dengan desain orisinal kreator lokal. Dicetak sesuai pesanan, dikirim ke seluruh Indonesia.";

  // canonical keeps only the indexable parameters
  const canon = new URLSearchParams();
  if (type.length) canon.set("type", type.join(","));
  if (category) canon.set("category", category);
  const url = absoluteUrl(`/products${canon.size ? `?${canon}` : ""}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: { type: "website", title, description, url, siteName: "KaryaKita", locale: "id_ID" },
    twitter: { card: "summary", title, description },
  };
}

export default function ProductsPage() {
  return <Catalog />;
}
