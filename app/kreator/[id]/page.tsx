import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import ProductCard from "@/components/ProductCard";
import { getDesigner } from "@/lib/api";
import { compact, fmtDate } from "@/lib/format";
import { SORTS, searchProducts, type SearchFilters } from "@/lib/search";
import { absoluteUrl } from "@/lib/site";

// Public creator storefront: profile header + that creator's active products
// (GET /api/search?designer=). Sort and page live in the URL and are plain
// links, so the page is fully server-rendered.

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { id } = await params;
  const d = await getDesigner(id);
  if (!d) return { title: "Kreator tidak ditemukan — KaryaKita", robots: { index: false } };
  const where = d.city ? ` dari ${d.city}` : "";
  const description =
    d.bio.trim() ||
    `Kreator${where} di KaryaKita. ${d.products} produk aktif, ${d.sold.toLocaleString("id-ID")} terjual. Setiap pembelian mengalirkan royalti langsung ke kreatornya.`;
  const title = `${d.name} — Kreator di KaryaKita`;
  const url = absoluteUrl(`/kreator/${d.id}`);
  // data: avatars (generated initials) are not usable as share images
  const image = d.avatar.startsWith("/") ? absoluteUrl(d.avatar) : /^https?:\/\//.test(d.avatar) ? d.avatar : undefined;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "profile", title, description, url, siteName: "KaryaKita", locale: "id_ID", ...(image && { images: [image] }) },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image && { images: [image] }) },
  };
}

const href = (id: string, sort: string, page: number) => {
  const sp = new URLSearchParams();
  if (sort) sp.set("sort", sort);
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return `/kreator/${id}${qs ? `?${qs}` : ""}`;
};

export default async function CreatorPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const d = await getDesigner(id);
  if (!d) notFound();

  const sort = SORTS.some((s) => s.id && s.id === sp.sort) ? sp.sort! : "terlaris";
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const filters: SearchFilters = {
    q: "", type: [], category: "", attr: [], color: "", min: 0, max: 0, designer: d.id, sort, page,
  };
  const result = await searchProducts(filters);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="card flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:text-left">
        <Avatar uri={d.avatar} name={d.name} hue={d.hue} size={96} />
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight">{d.name}</h1>
          <p className="mt-1 text-sm text-ink/55">
            {d.city && <>{d.city} · </>}Bergabung sejak {fmtDate(d.since)}
          </p>
          {d.bio && <p className="mt-3 max-w-2xl text-sm text-ink/75">{d.bio}</p>}
        </div>
        <dl className="flex gap-6 text-center">
          <div>
            <dt className="text-xs text-ink/55">Produk</dt>
            <dd className="text-xl font-extrabold">{d.products.toLocaleString("id-ID")}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink/55">Terjual</dt>
            <dd className="text-xl font-extrabold">{compact(d.sold)}</dd>
          </div>
        </dl>
      </header>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold">Karya {d.name}</h2>
        <nav aria-label="Urutkan" className="flex flex-wrap gap-2">
          {SORTS.filter((s) => s.id).map((s) => (
            <Link
              key={s.id}
              href={href(d.id, s.id === "terlaris" ? "" : s.id, 1)}
              aria-current={s.id === sort ? "true" : undefined}
              className={`chip border transition ${s.id === sort ? "border-jade-700 bg-jade-700 text-white" : "border-ink/12 bg-white text-ink/70 hover:border-ink/30"}`}
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </div>

      {result.products.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-ink/55">Kreator ini belum punya produk yang dijual.</div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {result.products.map((l) => (
            <ProductCard key={l.id} listing={l} />
          ))}
        </div>
      )}

      {result.pages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-3 text-sm font-semibold" aria-label="Halaman">
          {result.page > 1 ? (
            <Link className="btn-secondary btn-sm" href={href(d.id, sort === "terlaris" ? "" : sort, result.page - 1)}>← Sebelumnya</Link>
          ) : (
            <span className="btn-secondary btn-sm opacity-35">← Sebelumnya</span>
          )}
          <span className="text-ink/55">Halaman {result.page} dari {result.pages}</span>
          {result.page < result.pages ? (
            <Link className="btn-secondary btn-sm" href={href(d.id, sort === "terlaris" ? "" : sort, result.page + 1)}>Berikutnya →</Link>
          ) : (
            <span className="btn-secondary btn-sm opacity-35">Berikutnya →</span>
          )}
        </nav>
      )}
    </div>
  );
}
